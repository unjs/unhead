// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useDom } from '../../../unhead/test/fixtures'
import { renderDOMHead } from '../../src/v4/client'
import { useHead } from '../../src/v4/composables'
import { csrVueAppWithV4Head, flush } from './util'

describe('v4 client v3 compat', () => {
  it('renderDOMHead flushes head state gated by dom:beforeRender (Nuxt <=4.4 syncHead path)', async () => {
    const dom = useDom()
    const title = ref('initial')
    let pause = true
    const { head } = csrVueAppWithV4Head(dom, () => {
      useHead({ title })
    })
    // Nuxt's unhead plugin pauses DOM writes during hydration through the
    // dom:beforeRender shim, then calls renderDOMHead(head) to flush.
    head.hooks!.hook('dom:beforeRender', (ctx: { shouldRender: boolean }) => {
      ctx.shouldRender = !pause
    })
    await flush()
    expect(dom.window.document.title).toBe('')

    pause = false
    await renderDOMHead(head)
    expect(dom.window.document.title).toBe('initial')
  })

  it('renderDOMHead accepts and ignores the v3 document option', async () => {
    const dom = useDom()
    const { head } = csrVueAppWithV4Head(dom, () => {
      useHead({ title: 'doc-option' })
    })
    await flush()
    // v4 binds its document at createHead time; the option is v3 signature compat.
    renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toBe('doc-option')
  })
})
