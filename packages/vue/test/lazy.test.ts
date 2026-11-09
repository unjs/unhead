// @vitest-environment jsdom
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, nextTick, onMounted, ref } from 'vue'
import { injectHead, useHead } from '../src'
import { createLazyHead } from '../src/lazy'
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

describe('vue lazy head', () => {
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
    head.render()
    head.blockLoad()
    expect(document.title).toBe('Home')
    expect(head.entries.size).toBe(1)

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

  it('a ref change after hydration loads the runtime and reaches the document', async () => {
    const title = ref('One')
    const App = defineComponent({
      setup() {
        useHead({ title })
        return () => h('div', 'x')
      },
    })
    await serverRender(App)
    const { head } = hydrate(App)
    head.render()
    title.value = 'Two'
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
    head.render()
    head.blockLoad()
    show.value = false
    await nextTick()
    head.render()
    await vi.waitFor(() => expect(document.querySelector('meta[name="child"]')).toBeNull())
    expect(document.title).toBe('Parent')
  })

  describe('calls the server could not have rendered', () => {
    it('useHead in setup of a hydrating component does not load', async () => {
      const App = defineComponent({
        setup() {
          useHead({ title: 'Covered' })
          return () => h('div', 'x')
        },
      })
      await serverRender(App)
      const head = createLazyHead()
      const load = vi.spyOn(head, 'load')
      createSSRApp(App).use(head).mount('#app')
      await nextTick()
      await settle()
      expect(load).not.toHaveBeenCalled()
    })

    it('useHead in onMounted loads at once', async () => {
      const App = defineComponent({
        setup() {
          onMounted(() => {
            useHead({ meta: [{ name: 'mounted', content: 'yes' }] })
          })
          return () => h('div', 'x')
        },
      })
      await serverRender(App)
      hydrate(App)
      await vi.waitFor(() => expect(document.querySelector('meta[name="mounted"]')?.getAttribute('content')).toBe('yes'))
    })

    it('useHead in a child mounted after hydration loads at once', async () => {
      const Child = defineComponent({
        setup() {
          useHead({ meta: [{ name: 'client-child', content: 'yes' }] })
          return () => h('span', 'child')
        },
      })
      const show = ref(false)
      const App = defineComponent({
        setup() {
          onMounted(() => {
            show.value = true
          })
          return () => h('div', show.value ? h(Child) : 'waiting')
        },
      })
      await serverRender(App)
      hydrate(App)
      await vi.waitFor(() => expect(document.querySelector('meta[name="client-child"]')?.getAttribute('content')).toBe('yes'))
    })

    it('a ref change in onMounted loads at once', async () => {
      const title = ref('Server')
      const App = defineComponent({
        setup() {
          useHead({ title })
          onMounted(() => {
            title.value = 'Mounted'
          })
          return () => h('div', 'x')
        },
      })
      await serverRender(App)
      hydrate(App)
      await vi.waitFor(() => expect(document.title).toBe('Mounted'))
    })

    it('a new page after blockLoad does not load before the pause starts', async () => {
      const Page = defineComponent({
        setup() {
          useHead({ title: 'Next page' })
          return () => h('span', 'next')
        },
      })
      const page = ref(false)
      const App = defineComponent({
        setup() {
          useHead({ title: 'First page' })
          return () => h('div', page.value ? h(Page) : 'first')
        },
      })
      await serverRender(App)
      const head = createLazyHead()
      createSSRApp(App).use(head).mount('#app')
      head.blockLoad()
      const load = vi.spyOn(head, 'load')
      page.value = true
      await nextTick()
      await settle()
      expect(load).not.toHaveBeenCalled()

      head.render()
      expect(load).toHaveBeenCalledTimes(1)
      await vi.waitFor(() => expect(document.title).toBe('Next page'))
    })

    it('a new page during a navigation pause does not load until the pause lifts', async () => {
      const Page = defineComponent({
        setup() {
          useHead({ title: 'Next page' })
          onMounted(() => {
            useHead({ meta: [{ name: 'next-mounted', content: 'yes' }] })
          })
          return () => h('span', 'next')
        },
      })
      const page = ref(false)
      const App = defineComponent({
        setup() {
          useHead({ title: 'First page' })
          return () => h('div', page.value ? h(Page) : 'first')
        },
      })
      await serverRender(App)
      let paused = false
      const head = createLazyHead()
      head.hooks.hook('dom:beforeRender', (ctx) => {
        ctx.shouldRender = !paused
      })
      createSSRApp(App).use(head).mount('#app')
      head.render()
      head.blockLoad()

      paused = true
      const load = vi.spyOn(head, 'load')
      page.value = true
      await nextTick()
      await settle()
      expect(load).not.toHaveBeenCalled()
      expect(document.title).toBe('First page')

      paused = false
      head.render()
      expect(load).toHaveBeenCalledTimes(1)
      await vi.waitFor(() => expect(document.querySelector('meta[name="next-mounted"]')).not.toBeNull())
    })

    it('a load during a hydration pause writes nothing until the pause lifts', async () => {
      const App = defineComponent({
        setup() {
          onMounted(() => {
            useHead({ meta: [{ name: 'paused', content: 'yes' }] })
          })
          return () => h('div', 'x')
        },
      })
      await serverRender(App)
      let paused = true
      const head = createLazyHead()
      head.hooks.hook('dom:beforeRender', (ctx) => {
        ctx.shouldRender = !paused
      })
      const load = vi.spyOn(head, 'load')
      createSSRApp(App).use(head).mount('#app')
      await nextTick()
      expect(load).toHaveBeenCalled()
      await load.mock.results[0].value
      await settle()
      expect(document.querySelector('meta[name="paused"]')).toBeNull()

      paused = false
      head.render()
      await vi.waitFor(() => expect(document.querySelector('meta[name="paused"]')).not.toBeNull())
    })
  })
})
