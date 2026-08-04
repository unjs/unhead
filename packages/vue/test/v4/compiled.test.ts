import { renderToString } from '@vue/server-renderer'
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createApp, createSSRApp, h } from 'vue'
import { emitEntryPlan } from '../../../unhead/src/v4/emit'
import { useDom } from '../../../unhead/test/fixtures'
import { createHead as createClientHead } from '../../src/v4/client-compiled'
import { useHead } from '../../src/v4/compiled'
import { createHead as createServerHead, renderSSRHead } from '../../src/v4/server-compiled'

describe('v4 Vue compiled profiles', () => {
  it('installs the sealed client profile and honors the Nuxt render gate', () => {
    const dom = useDom()
    const head = createClientHead({ document: dom.window.document, scheduler: () => {} })
    const app = createApp({ render: () => h('div') })
    app.use(head)

    let paused = true
    head.hooks.hook('dom:beforeRender', ctx => ctx.shouldRender = !paused)
    head.push(emitEntryPlan({ title: 'Compiled Vue' }).plan)
    expect(head.render()).toBe(false)
    expect(dom.window.document.title).not.toBe('Compiled Vue')

    paused = false
    expect(head.render()).toBe(true)
    expect(dom.window.document.title).toBe('Compiled Vue')
  })

  it('renders sealed plans with the Vue SSR newline contract', async () => {
    const head = createServerHead({ disableDefaults: true })
    const app = createSSRApp({
      setup() {
        head.push(emitEntryPlan({ title: 'Compiled', meta: [{ name: 'description', content: 'Vue' }] }).plan)
        return () => h('div')
      },
    })
    app.use(head)
    await renderToString(app)

    expect(renderSSRHead(head).headTags).toBe('<title>Compiled</title>\n<meta name="description" content="Vue">')
    expect(renderSSRHead(head, { omitLineBreaks: true }).headTags).toBe('<title>Compiled</title><meta name="description" content="Vue">')
  })

  it('binds a compiled entry to the component lifecycle without a resolver', async () => {
    const dom = useDom()
    const head = createClientHead({ document: dom.window.document, scheduler: () => {} })
    const app = createApp({
      setup() {
        useHead(emitEntryPlan({ title: 'Scoped' }).plan)
        return () => h('div')
      },
    })
    app.use(head)
    dom.window.document.body.innerHTML = '<div id="app"></div>'
    app.mount('#app')
    head.render()
    expect(dom.window.document.title).toBe('Scoped')

    app.unmount()
    head.render()
    expect(dom.window.document.title).toBe('')
  })
})
