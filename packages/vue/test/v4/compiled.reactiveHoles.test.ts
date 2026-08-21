// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createApp, h, nextTick, ref } from 'vue'
import { emitEntryPlan, hole } from '../../../unhead/src/v4/emit'
import { useDom } from '../../../unhead/test/fixtures'
import { createHead as createClientHead } from '../../src/v4/client-compiled'
import { useHead } from '../../src/v4/compiled'
import { createHead as createServerHead, renderSSRHead } from '../../src/v4/server-compiled'

describe('v4 compiled composable: reactive holes', () => {
  it('a ref-backed fills getter updates the DOM through the sealed renderer, no duplicate tags', async () => {
    const dom = useDom()
    const head = createClientHead({ document: dom.window.document, scheduler: () => {} })
    const { plan } = emitEntryPlan({ title: hole(), meta: [{ name: 'description', content: hole() }] })

    const title = ref('First')
    const desc = ref('one')
    const app = createApp({
      setup() {
        useHead(plan, { head, fills: () => [title.value, desc.value] })
        return () => h('div')
      },
    })
    app.use(head)
    dom.window.document.body.innerHTML = '<div id="app"></div>'
    app.mount('#app')
    head.render()
    expect(dom.window.document.title).toBe('First')
    expect(dom.window.document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('one')
    expect(dom.window.document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1)

    title.value = 'Second'
    desc.value = 'two'
    await nextTick()
    head.render()
    expect(dom.window.document.title).toBe('Second')
    expect(dom.window.document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('two')
    expect(dom.window.document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(dom.window.document.head.querySelectorAll('title')).toHaveLength(1)
  })

  it('escapes the fill on every refill, not only the first', async () => {
    const dom = useDom()
    const head = createClientHead({ document: dom.window.document, scheduler: () => {} })
    const { plan } = emitEntryPlan({ title: hole() })

    const title = ref('safe')
    const app = createApp({
      setup() {
        useHead(plan, { head, fills: () => [title.value] })
        return () => h('div')
      },
    })
    app.use(head)
    dom.window.document.body.innerHTML = '<div id="app"></div>'
    app.mount('#app')
    head.render()

    title.value = '<script>alert(1)</script>'
    await nextTick()
    head.render()
    expect(dom.window.document.title).toBe('<script>alert(1)</script>')
    expect(dom.window.document.head.innerHTML).not.toContain('<script>alert(1)</script>')
  })

  it('stops watching and disposes the entry on unmount', async () => {
    const dom = useDom()
    const head = createClientHead({ document: dom.window.document, scheduler: () => {} })
    const { plan } = emitEntryPlan({ title: hole() })
    const title = ref('mounted')

    const app = createApp({
      setup() {
        useHead(plan, { head, fills: () => [title.value] })
        return () => h('div')
      },
    })
    app.use(head)
    dom.window.document.body.innerHTML = '<div id="app"></div>'
    app.mount('#app')
    head.render()
    expect(dom.window.document.title).toBe('mounted')

    app.unmount()
    head.render()
    expect(dom.window.document.title).toBe('')

    // ref changes after unmount must not resurrect the entry or throw
    title.value = 'after unmount'
    await nextTick()
    expect(() => head.render()).not.toThrow()
    expect(dom.window.document.title).toBe('')
  })

  it('dev mode throws loudly when a getter resolves to null (a hole cannot omit an attribute)', async () => {
    const dom = useDom()
    const head = createClientHead({ document: dom.window.document, scheduler: () => {} })
    const { plan } = emitEntryPlan({ meta: [{ name: 'description', content: hole() }] })
    const content = ref<string | null>('ok')

    const app = createApp({
      setup() {
        useHead(plan, { head, fills: () => [content.value] })
        return () => h('div')
      },
    })
    app.use(head)
    dom.window.document.body.innerHTML = '<div id="app"></div>'
    app.mount('#app')
    head.render()

    content.value = null
    await expect(nextTick()).rejects.toThrow(/hole #0 resolved to null/)
  })

  it('sSR evaluates the getter once and never installs a watcher', async () => {
    const head = createServerHead({ disableDefaults: true })
    const { plan } = emitEntryPlan({ title: hole() })
    const title = ref('server value')

    const entry = useHead(plan, { head, fills: () => [title.value] })
    expect(renderSSRHead(head).headTags).toBe('<title>server value</title>')

    // no watcher was installed: a post-push ref change must not retroactively
    // change what has already rendered
    title.value = 'changed after render'
    expect(renderSSRHead(head).headTags).toBe('<title>server value</title>')

    // dispose must still work even though there's no watcher to stop
    expect(() => entry.dispose()).not.toThrow()
  })

  it('a static (non-function) fills array is unaffected: no watcher, same behavior as before', async () => {
    const dom = useDom()
    const head = createClientHead({ document: dom.window.document, scheduler: () => {} })
    const { plan } = emitEntryPlan({ title: hole() })

    const entry = useHead(plan, { head, fills: ['static'] })
    head.render()
    expect(dom.window.document.title).toBe('static')

    entry.patch(plan, ['patched'])
    head.render()
    expect(dom.window.document.title).toBe('patched')
  })
})
