// @vitest-environment jsdom
import { renderToString } from '@vue/server-renderer'
import { compileTags, dynamicValue } from 'unhead/compiled'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, effectScope, getCurrentScope, h, KeepAlive, nextTick, onMounted, ref } from 'vue'
import { useHead } from '../src'
import { useCompiledHead } from '../src/compiled'
import { Head } from '../src/components'
import { createLazyHead } from '../src/lazy'
import { createHead as createServerHead, renderSSRHead } from '../src/server'

const v3Runtime = vi.hoisted(() => ({ heads: new Set<unknown>() }))
vi.mock('../../unhead/src/lazy/runtime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../unhead/src/lazy/runtime')>()
  return {
    ...actual,
    upgradeHead: (...args: Parameters<typeof actual.upgradeHead>) => {
      v3Runtime.heads.add(args[0])
      return actual.upgradeHead(...args)
    },
  }
})

const settle = (ms = 40) => new Promise(resolve => setTimeout(resolve, ms))

function compiledTags(input: unknown, dynamicValues?: number): any {
  const result = compileTags(input, { dynamicValues })
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  return result.tags
}

const home: any = { title: 'Home', meta: [{ name: 'description', content: 'home' }], link: [{ rel: 'canonical', href: '/' }] }
const homeTags = compiledTags(home)

// the server renders loose input, the client the same input compiled
let onServer = false
function headOf(input: any) {
  return onServer ? useHead(input) : useCompiledHead(compiledTags(input))
}

async function serverRender(component: ReturnType<typeof defineComponent>) {
  const head = createServerHead({ disableDefaults: true })
  onServer = true
  const html = await renderToString(createSSRApp(component).use(head)).finally(() => {
    onServer = false
  })
  const { headTags } = renderSSRHead(head)
  document.title = ''
  document.head.innerHTML = headTags
  document.body.innerHTML = `<div id="app">${html}</div>`
}

function hydrate(component: ReturnType<typeof defineComponent>) {
  const head = createLazyHead()
  const app = createSSRApp(component).use(head)
  app.mount('#app')
  return { app, head }
}

describe('useCompiledHead', () => {
  beforeEach(() => {
    vi.stubGlobal('requestIdleCallback', () => 1)
    vi.stubGlobal('cancelIdleCallback', () => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('hydrates a server head on the compiled runtime with no DOM change', async () => {
    const Server = defineComponent({
      setup() {
        useHead(home)
        return () => h('div', 'home')
      },
    })
    const Client = defineComponent({
      setup() {
        headOf(home)
        return () => h('div', 'home')
      },
    })
    await serverRender(Server)
    const before = document.documentElement.outerHTML
    const nodes = [...document.head.children]
    const { head } = hydrate(Client)
    head.render()
    await head.load()
    await settle()
    expect(document.documentElement.outerHTML).toBe(before)
    expect([...document.head.children]).toEqual(nodes)
    expect(v3Runtime.heads.has(head)).toBe(false)
  })

  it('patches values from refs and getters through one effect', async () => {
    const title = ref('One')
    const description = ref('first')
    const titled = compiledTags({ title: dynamicValue(0), meta: [{ name: 'description', content: dynamicValue(1) }] }, 2)
    let effects = 0
    const App = defineComponent({
      setup() {
        const scope = getCurrentScope() as any
        const before = scope.effects.length
        const entry = useCompiledHead(titled, [title, () => description.value])
        effects = scope.effects.length - before
        expect(entry._i).toBeGreaterThan(0)
        return () => h('div', 'x')
      },
    })
    await serverRender(defineComponent({
      setup() {
        useHead({ title: 'One', meta: [{ name: 'description', content: 'first' }] })
        return () => h('div', 'x')
      },
    }))
    const { head } = hydrate(App)
    head.render()
    await head.load()
    await settle()
    expect(effects).toBe(1)
    const meta = document.querySelector('meta[name="description"]')
    title.value = 'Two'
    description.value = 'second'
    await vi.waitFor(() => expect(document.title).toBe('Two'))
    expect(document.querySelector('meta[name="description"]')).toBe(meta)
    expect(meta!.getAttribute('content')).toBe('second')
    expect(head.entries.size).toBe(1)
  })

  it('creates no effect without values', async () => {
    let effects = -1
    const App = defineComponent({
      setup() {
        const scope = getCurrentScope() as any
        const before = scope.effects.length
        headOf(home)
        effects = scope.effects.length - before
        return () => h('div', 'x')
      },
    })
    await serverRender(App)
    hydrate(App)
    expect(effects).toBe(0)
  })

  it('disposes on unmount and follows KeepAlive', async () => {
    const show = ref<'a' | 'b' | 'none'>('a')
    const PageA = defineComponent({
      name: 'PageA',
      setup() {
        headOf({ meta: [{ name: 'page', content: 'a' }] })
        return () => h('span', 'a')
      },
    })
    const PageB = defineComponent({
      name: 'PageB',
      setup() {
        headOf({ meta: [{ name: 'other', content: 'b' }] })
        return () => h('span', 'b')
      },
    })
    const App = defineComponent({
      setup() {
        headOf(home)
        return () => h('div', [h(KeepAlive, { include: 'PageA' }, [show.value === 'a' ? h(PageA) : show.value === 'b' ? h(PageB) : null])])
      },
    })
    await serverRender(App)
    const { head } = hydrate(App)
    head.render()
    await head.load()
    await settle()
    expect(document.querySelector('meta[name="page"]')).not.toBeNull()
    show.value = 'b'
    await nextTick()
    await settle()
    expect(document.querySelector('meta[name="page"]')).toBeNull()
    expect(document.querySelector('meta[name="other"]')).not.toBeNull()
    show.value = 'a'
    await nextTick()
    await settle()
    expect(document.querySelector('meta[name="page"]')).not.toBeNull()
    expect(document.querySelector('meta[name="other"]')).toBeNull()
    show.value = 'none'
    await nextTick()
    await settle()
    expect(document.querySelector('meta[name="page"]')).toBeNull()
    expect(document.title).toBe('Home')
  })

  it('makes no load while a KeepAlive page hydrates, as loose useHead', async () => {
    const Page = defineComponent({
      name: 'Page',
      setup() {
        headOf(home)
        return () => h('span', 'page')
      },
    })
    const App = defineComponent({ setup: () => () => h('div', [h(KeepAlive, null, [h(Page)])]) })
    await serverRender(App)
    const head = createLazyHead()
    const load = vi.spyOn(head, 'load')
    createSSRApp(App).use(head).mount('#app')
    await nextTick()
    head.render()
    await settle()
    expect(load).not.toHaveBeenCalled()
  })

  it('removes a server tag that a navigation drops before the first draw after a client-only push', async () => {
    const showTitle = ref(false)
    const showCanonical = ref(true)
    const Title = defineComponent({
      setup() {
        headOf({ title: 'Client' })
        return () => h('i', 'title')
      },
    })
    const Canonical = defineComponent({
      setup() {
        headOf({ link: [{ rel: 'canonical', href: '/page' }] })
        return () => h('i', 'canonical')
      },
    })
    const App = defineComponent({
      setup() {
        headOf({ title: 'Root', meta: [{ name: 'description', content: 'root' }] })
        return () => h('div', [showTitle.value ? h(Title) : h('b'), showCanonical.value ? h(Canonical) : h('b')])
      },
    })
    await serverRender(App)
    const { head } = hydrate(App)
    // a push the server never rendered loads the runtime at once
    showTitle.value = true
    await nextTick()
    head.render()
    await head.load()
    // the navigation removes the page before the first draw
    head.blockLoad()
    showCanonical.value = false
    await nextTick()
    head.render()
    await settle()
    expect(document.querySelector('link[rel="canonical"]')?.outerHTML).toBeUndefined()
    expect(document.title).toBe('Client')
    expect(v3Runtime.heads.has(head)).toBe(false)
  })

  it('disposes with an effect scope when there is no component', async () => {
    const head = createLazyHead()
    document.head.innerHTML = ''
    const scope = effectScope()
    scope.run(() => useCompiledHead(compiledTags({ meta: [{ name: 'scoped', content: 'yes' }] }), undefined, { head }))
    await head.load()
    await settle()
    expect(document.querySelector('meta[name="scoped"]')).not.toBeNull()
    scope.stop()
    await settle()
    expect(document.querySelector('meta[name="scoped"]')).toBeNull()
  })

  it('returns a no-op entry in a stopped scope', () => {
    const head = createLazyHead()
    const inactive = effectScope()
    inactive.run(() => {
      inactive.stop()
      const noop = useCompiledHead(homeTags, undefined, { head })
      expect(noop._i).toBe(-1)
    })
    expect(head.entries.size).toBe(0)
  })

  it('loads at once for a call the server could not have rendered', async () => {
    const App = defineComponent({
      setup() {
        headOf(home)
        onMounted(() => {
          useCompiledHead(compiledTags({ meta: [{ name: 'mounted', content: 'yes' }] }))
        })
        return () => h('div', 'x')
      },
    })
    await serverRender(App)
    const head = createLazyHead()
    const load = vi.spyOn(head, 'load')
    createSSRApp(App).use(head).mount('#app')
    await vi.waitFor(() => expect(document.querySelector('meta[name="mounted"]')).not.toBeNull())
    expect(load).toHaveBeenCalled()
  })

  it('hands a page over to v3 when a <Head> component mounts mid-session', async () => {
    // what a build with `compile: { debug: true }` defines
    vi.stubGlobal('__UNHEAD_COMPILE_DEBUG__', true)
    const show = ref(false)
    const Titled = defineComponent({
      setup() {
        return () => h(Head, null, () => [h('title', 'Component title'), h('meta', { name: 'component', content: 'yes' })])
      },
    })
    const App = defineComponent({
      setup() {
        headOf(home)
        headOf({ htmlAttrs: { class: 'compiled' }, meta: [{ property: 'og:image', content: '/1.png' }, { property: 'og:image', content: '/2.png' }] })
        return () => h('div', [show.value ? h(Titled) : h('span', 'plain')])
      },
    })
    await serverRender(App)
    const { head } = hydrate(App)
    head.render()
    await head.load()
    await settle()
    expect(v3Runtime.heads.has(head)).toBe(false)
    expect((head as any)._fullRuntimeReason).toBeUndefined()
    const canonical = document.querySelector('link[rel="canonical"]')
    show.value = true
    await nextTick()
    await vi.waitFor(() => expect(document.title).toBe('Component title'))
    expect(v3Runtime.heads.has(head)).toBe(true)
    // the debug signal names the first entry without compiled tags
    expect(JSON.stringify((head as any)._fullRuntimeReason.entry.input)).toContain('Component title')
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(document.querySelectorAll('meta[property="og:image"]')).toHaveLength(2)
    expect(document.querySelector('link[rel="canonical"]')).toBe(canonical)
    expect(document.querySelector('meta[name="component"]')).not.toBeNull()
    expect(document.documentElement.className).toBe('compiled')
    show.value = false
    await nextTick()
    await vi.waitFor(() => expect(document.title).toBe('Home'))
    expect(document.querySelector('meta[name="component"]')).toBeNull()
    expect(document.querySelectorAll('meta[property="og:image"]')).toHaveLength(2)
  })
})
