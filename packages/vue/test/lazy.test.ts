// @vitest-environment jsdom
import { renderToString } from '@vue/server-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { injectHead, useHead } from '../src'
import { createHead as createLazyHead } from '../src/lazy'
import { useScript } from '../src/scripts'
import { createHead as createServerHead, renderSSRHead } from '../src/server'

const settle = (ms = 40) => new Promise(resolve => setTimeout(resolve, ms))

async function serverRender(component: ReturnType<typeof defineComponent>) {
  const head = createServerHead({ disableDefaults: true })
  const html = await renderToString(createSSRApp(component).use(head))
  const { headTags } = renderSSRHead(head)
  document.head.innerHTML = headTags
  document.body.innerHTML = `<div id="app">${html}</div>`
}

function hydrate(component: ReturnType<typeof defineComponent>) {
  const head = createLazyHead()
  const app = createSSRApp(component).use(head)
  app.mount('#app')
  return { app, head }
}

// the production path: the dev warning has its own test
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('vue lazy head', () => {
  it('keeps script status reactive across activation', async () => {
    document.head.innerHTML = ''
    const head = createLazyHead()
    const app = createSSRApp({})
    app.use(head)
    const script = app.runWithContext(() => useScript('/lazy-script.js', { trigger: 'manual' }))

    const loading = script.load()
    expect(script.status.value).toBe('loading')
    await head.load()
    await vi.waitFor(() => {
      const element = document.querySelector('script[src="/lazy-script.js"]')
      expect(element).not.toBeNull()
      element!.dispatchEvent(new Event('load'))
    })
    await loading
    expect(script.status.value).toBe('loaded')
    expect(app.runWithContext(() => useScript('/lazy-script.js', { trigger: 'manual' })).status).toBe(script.status)
    script.remove()
  })

  it('lets a queued plugin read the injected head entries during resolution', async () => {
    document.head.innerHTML = '<title>Server</title>'
    const head = createLazyHead({ document })
    const app = createSSRApp({}).use(head)
    const injected = app.runWithContext(injectHead)
    injected.use({
      key: 'derived-tags',
      hooks: {
        'tags:beforeResolve': (context) => {
          for (const entry of injected.entries.values()) {
            const title = entry._tags?.find(tag => tag.tag === 'title')?.textContent
            if (title)
              context.tags.push({ tag: 'meta', props: { name: 'derived-title', content: title } })
          }
        },
      },
    })
    head.finishHydration()
    head.push({ title: 'New page' })
    await head.load()
    await vi.waitFor(() => expect(document.querySelector('meta[name="derived-title"]')?.getAttribute('content')).toBe('New page'))
  })

  it('names the component of a client only value in a dev warning', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ColorMode = defineComponent({
      __name: 'ColorMode',
      setup() {
        useHead({ meta: [{ name: 'theme-color', content: '#000' }] })
        return () => h('div', 'x')
      },
    })
    await serverRender(ColorMode)
    // the server computed another value
    document.head.innerHTML = '<meta name="theme-color" content="#fff">'
    const client = hydrate(ColorMode)
    client.head.finishHydration()
    await vi.waitFor(() => {
      expect(warn.mock.calls.map(call => String(call[0]))).toEqual([
        expect.stringContaining('<meta name="theme-color"> differs from the server head in content. Pushed by ColorMode.'),
      ])
    })
  })

  it('leaves the server head alone during hydration, then adopts it', async () => {
    const App = defineComponent({
      setup() {
        useHead({ title: 'Home', meta: [{ name: 'description', content: 'desc' }] })
        return () => h('div', 'home')
      },
    })
    await serverRender(App)
    const nodes = [...document.head.children]
    const { head } = hydrate(App)
    head.finishHydration()
    expect(document.title).toBe('Home')

    await head.load()
    await settle()
    expect([...document.head.children]).toEqual(nodes)
  })

  it('injects the same head and tracks refs after load', async () => {
    const title = ref('One')
    const App = defineComponent({
      setup() {
        expect(injectHead()).toBeDefined()
        useHead({ title })
        return () => h('div', 'x')
      },
    })
    await serverRender(App)
    const { head } = hydrate(App)
    await head.load()
    await settle()
    expect(document.title).toBe('One')

    title.value = 'Two'
    await vi.waitFor(() => expect(document.title).toBe('Two'))
  })

  it('a ref change after hydration waits for activation', async () => {
    const title = ref('One')
    const App = defineComponent({
      setup() {
        useHead({ title })
        return () => h('div', 'x')
      },
    })
    await serverRender(App)
    const { head } = hydrate(App)
    head.finishHydration()
    title.value = 'Two'
    await nextTick()
    expect(document.title).toBe('One')
    await head.load()
    await vi.waitFor(() => expect(document.title).toBe('Two'))
  })

  it('an unmount before load removes the tags of that component', async () => {
    const show = ref(true)
    const Child = defineComponent({
      setup() {
        useHead({ meta: [{ name: 'child', content: 'yes' }] })
        return () => h('span', 'child')
      },
    })
    const App = defineComponent({
      setup() {
        useHead({ title: 'Parent' })
        return () => h('div', show.value ? h(Child) : 'gone')
      },
    })
    await serverRender(App)
    expect(document.querySelector('meta[name="child"]')).not.toBeNull()
    const { head } = hydrate(App)
    head.finishHydration()
    show.value = false
    await nextTick()
    await head.load()
    await vi.waitFor(() => expect(document.querySelector('meta[name="child"]')).toBeNull())
    expect(document.title).toBe('Parent')
  })

  // Nuxt's `<Link>` components share one reactive input. Each one edits its item in its render
  // and patches with the same object, so a deep read inside that render made the renders loop.
  it('components that edit one shared input in their render hydrate without a loop, and their links go on unmount', async () => {
    let renders = 0
    const shared = new WeakMap<object, { input: any, entry: any }>()
    const Link = defineComponent({
      props: { rel: String, href: String },
      setup(props) {
        const head = injectHead()
        let state = shared.get(head)
        if (!state) {
          const input = reactive<{ link: any[] }>({ link: [] })
          shared.set(head, state = { input, entry: head.push(input) })
        }
        const { input, entry } = state
        const index = input.link.push(null) - 1
        onBeforeUnmount(() => {
          input.link[index] = null
          entry.patch(input)
        })
        return () => {
          renders++
          input.link[index] = { rel: props.rel, href: props.href, key: props.rel }
          entry.patch(input)
          return null
        }
      },
    })
    const show = ref(true)
    const App = defineComponent({
      setup() {
        useHead({ title: 'Guide' })
        return () => h('div', show.value ? [h(Link, { rel: 'prev', href: '/a' }), h(Link, { rel: 'next', href: '/b' })] : 'home')
      },
    })
    await serverRender(App)
    const { head } = hydrate(App)
    head.finishHydration()
    await settle()
    expect(renders).toBeLessThan(10)
    expect(document.querySelectorAll('link[rel="prev"], link[rel="next"]')).toHaveLength(2)
    show.value = false
    await nextTick()
    await head.load()
    await vi.waitFor(() => expect(document.querySelectorAll('link[rel="prev"], link[rel="next"]')).toHaveLength(0))
  })

  it('waits for the framework before rendering a client only entry', async () => {
    const App = defineComponent({
      setup() {
        onMounted(() => useHead({ meta: [{ name: 'mounted', content: 'yes' }] }))
        return () => h('div', 'x')
      },
    })
    await serverRender(App)
    const { head } = hydrate(App)
    head.finishHydration()
    expect(document.querySelector('meta[name="mounted"]')).toBeNull()
    await head.load()
    await vi.waitFor(() => expect(document.querySelector('meta[name="mounted"]')?.getAttribute('content')).toBe('yes'))
  })
})
