// @vitest-environment jsdom

import { renderDOMHead } from '@unhead/dom'
import { createHead } from '@unhead/vue/client'
import { resolveTags } from 'unhead/utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { useDom } from '../../../../unhead/test/fixtures'
import { Head } from '../../../src/components'

describe('head component — Style inside Head (issue #517)', () => {
  it('style with children prop renders textContent', async () => {
    // <Head><Style children="body { background: red }" /></Head>
    const head = createHead()
    const App = defineComponent({
      render() {
        return h(Head, null, {
          default: () => [
            h('style', { children: 'body { background: red }' }),
          ],
        })
      },
    })
    const el = document.createElement('div')
    const { createApp } = await import('vue')
    const app = createApp(App)
    app.use(head)
    app.mount(el)
    await nextTick()

    const tags = resolveTags(head)
    const styleTag = tags.find(t => t.tag === 'style')
    expect(styleTag).toBeDefined()
    expect(styleTag?.textContent).toBe('body { background: red }')
  })

  it('style with slot text content renders textContent', async () => {
    // <Head><Style>body { background: red }</Style></Head>
    const head = createHead()
    const App = defineComponent({
      render() {
        return h(Head, null, {
          default: () => [
            h('style', null, 'body { background: red }'),
          ],
        })
      },
    })
    const el = document.createElement('div')
    const { createApp } = await import('vue')
    const app = createApp(App)
    app.use(head)
    app.mount(el)
    await nextTick()

    const tags = resolveTags(head)
    const styleTag = tags.find(t => t.tag === 'style')
    expect(styleTag).toBeDefined()
    expect(styleTag?.textContent).toBe('body { background: red }')
  })

  it('style with dynamic slot content (array children)', async () => {
    // Simulates <Style>{{ css }}</Style> where css is reactive
    const css = ref('body { color: blue }')
    const head = createHead()
    const App = defineComponent({
      render() {
        return h(Head, null, {
          default: () => [
            h('style', null, [css.value]),
          ],
        })
      },
    })
    const el = document.createElement('div')
    const { createApp } = await import('vue')
    const app = createApp(App)
    app.use(head)
    app.mount(el)
    await nextTick()

    const tags = resolveTags(head)
    const styleTag = tags.find(t => t.tag === 'style')
    expect(styleTag).toBeDefined()
    expect(styleTag?.textContent).toBe('body { color: blue }')
  })

  it('style inside Head renders to DOM', async () => {
    const dom = useDom()
    const head = createHead({ document: dom.window.document })
    const App = defineComponent({
      render() {
        return h(Head, null, {
          default: () => [
            h('style', { children: 'body { background: red }' }),
          ],
        })
      },
    })
    const { createApp } = await import('vue')
    const app = createApp(App)
    app.use(head)
    dom.window.document.body.innerHTML = '<div id="app"></div>'
    app.mount('#app')
    await nextTick()
    await renderDOMHead(head, { document: dom.window.document })

    const styleEl = dom.window.document.querySelector('style')
    expect(styleEl).not.toBeNull()
    expect(styleEl?.textContent).toBe('body { background: red }')
  })

  it('children prop maps to textContent (backward compat)', async () => {
    // Ensure children prop is recognized for style and script
    const head = createHead()
    const App = defineComponent({
      render() {
        return h(Head, null, {
          default: () => [
            h('style', { children: '.foo { color: red }' }),
            h('script', { children: 'console.log(1)' }),
          ],
        })
      },
    })
    const el = document.createElement('div')
    const { createApp } = await import('vue')
    const app = createApp(App)
    app.use(head)
    app.mount(el)
    await nextTick()

    const tags = resolveTags(head)
    const styleTag = tags.find(t => t.tag === 'style')
    const scriptTag = tags.find(t => t.tag === 'script')
    expect(styleTag?.textContent).toBe('.foo { color: red }')
    // script uses innerHTML
    expect(scriptTag?.innerHTML).toBe('console.log(1)')
  })

  it('title slot content is resolved', async () => {
    const head = createHead()
    const App = defineComponent({
      render() {
        return h(Head, null, {
          default: () => [
            h('title', null, 'My Page Title'),
          ],
        })
      },
    })
    const el = document.createElement('div')
    const { createApp } = await import('vue')
    const app = createApp(App)
    app.use(head)
    app.mount(el)
    await nextTick()

    const tags = resolveTags(head)
    const titleTag = tags.find(t => t.tag === 'title')
    expect(titleTag?.textContent).toBe('My Page Title')
  })
})
