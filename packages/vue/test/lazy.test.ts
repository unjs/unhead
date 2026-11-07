// @vitest-environment jsdom
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, ref } from 'vue'
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
    head.cancelLoad()
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
    head.cancelLoad()
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
    head.cancelLoad()
    show.value = false
    await vi.waitFor(() => expect(document.querySelector('meta[name="child"]')).toBeNull())
    expect(document.title).toBe('Parent')
  })
})
