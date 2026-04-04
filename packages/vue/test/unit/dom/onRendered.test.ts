// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useDom } from '../../../../unhead/test/fixtures'
import { useHead, useSeoMeta } from '../../../src'
import { renderDOMHead } from '../../../src/client'
import { csrVueAppWithUnhead } from '../../util'

describe('onRendered option (Vue)', () => {
  it('calls onRendered after DOM render via useHead', async () => {
    const dom = useDom()
    const onRendered = vi.fn()

    const head = csrVueAppWithUnhead(dom, () => {
      useHead({ title: 'Hello World' }, { onRendered })
    })

    renderDOMHead(head, { document: dom.window.document })

    expect(onRendered).toHaveBeenCalledOnce()
    expect(dom.window.document.title).toBe('Hello World')
  })

  it('callback receives renders context', async () => {
    const dom = useDom()
    let capturedCtx: any

    const head = csrVueAppWithUnhead(dom, () => {
      useHead({ title: 'Test Page' }, {
        onRendered(ctx) {
          capturedCtx = ctx
        },
      })
    })

    renderDOMHead(head, { document: dom.window.document })

    expect(capturedCtx).toBeDefined()
    expect(capturedCtx.renders).toBeInstanceOf(Array)
    const titleRender = capturedCtx.renders.find((r: any) => r.tag.tag === 'title')
    expect(titleRender).toBeDefined()
    expect(titleRender.tag.textContent).toBe('Test Page')
  })

  it('fires on reactive updates', async () => {
    const dom = useDom()
    const onRendered = vi.fn()
    const title = ref('Initial')

    const head = csrVueAppWithUnhead(dom, () => {
      useHead({ title }, { onRendered })
    })

    renderDOMHead(head, { document: dom.window.document })
    expect(onRendered).toHaveBeenCalledTimes(1)
    expect(dom.window.document.title).toBe('Initial')

    title.value = 'Updated'
    await nextTick()
    renderDOMHead(head, { document: dom.window.document })

    expect(onRendered).toHaveBeenCalledTimes(2)
    expect(dom.window.document.title).toBe('Updated')
  })

  it('stops firing after dispose', async () => {
    const dom = useDom()
    const onRendered = vi.fn()
    let entry: any

    const head = csrVueAppWithUnhead(dom, () => {
      entry = useHead({ title: 'Page' }, { onRendered })
    })

    renderDOMHead(head, { document: dom.window.document })
    expect(onRendered).toHaveBeenCalledTimes(1)

    entry.dispose()

    head.push({ title: 'Page 2' })
    renderDOMHead(head, { document: dom.window.document })
    expect(onRendered).toHaveBeenCalledTimes(1)
  })

  it('works with useSeoMeta', async () => {
    const dom = useDom()
    const onRendered = vi.fn()

    const head = csrVueAppWithUnhead(dom, () => {
      useSeoMeta({ title: 'SEO Page' }, { onRendered })
    })

    renderDOMHead(head, { document: dom.window.document })

    expect(onRendered).toHaveBeenCalledOnce()
    expect(dom.window.document.title).toBe('SEO Page')
  })
})
