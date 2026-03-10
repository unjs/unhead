// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useDom } from '../../../../unhead/test/fixtures'
import { onHeadUpdated, useHead } from '../../../src'
import { renderDOMHead } from '../../../src/client'
import { csrVueAppWithUnhead } from '../../util'

describe('onHeadUpdated', () => {
  it('calls callback after DOM is rendered', async () => {
    const dom = useDom()
    const callback = vi.fn()

    const head = csrVueAppWithUnhead(dom, () => {
      onHeadUpdated(callback)
      useHead({ title: 'Hello World' })
    })

    renderDOMHead(head, { document: dom.window.document })

    expect(callback).toHaveBeenCalledOnce()
    expect(dom.window.document.title).toBe('Hello World')
  })

  it('callback receives renders context with tags', async () => {
    const dom = useDom()
    let capturedCtx: any

    const head = csrVueAppWithUnhead(dom, () => {
      onHeadUpdated((ctx) => {
        capturedCtx = ctx
      })
      useHead({ title: 'Test Page' })
    })

    renderDOMHead(head, { document: dom.window.document })

    expect(capturedCtx).toBeDefined()
    expect(capturedCtx.renders).toBeInstanceOf(Array)
    const titleRender = capturedCtx.renders.find((r: any) => r.tag.tag === 'title')
    expect(titleRender).toBeDefined()
    expect(titleRender.tag.textContent).toBe('Test Page')
  })

  it('called on every render', async () => {
    const dom = useDom()
    const callback = vi.fn()
    const title = ref('Initial')

    const head = csrVueAppWithUnhead(dom, () => {
      onHeadUpdated(callback)
      useHead({ title })
    })

    renderDOMHead(head, { document: dom.window.document })
    expect(callback).toHaveBeenCalledTimes(1)
    expect(dom.window.document.title).toBe('Initial')

    title.value = 'Updated'
    // wait for watchEffect to flush and mark head dirty
    await nextTick()
    renderDOMHead(head, { document: dom.window.document })

    expect(callback).toHaveBeenCalledTimes(2)
    expect(dom.window.document.title).toBe('Updated')
  })

  it('returns unsubscribe function that stops further callbacks', async () => {
    const dom = useDom()
    const callback = vi.fn()

    const head = csrVueAppWithUnhead(dom, () => {
      useHead({ title: 'Page' })
    })

    const unsub = onHeadUpdated(callback, { head })

    renderDOMHead(head, { document: dom.window.document })
    expect(callback).toHaveBeenCalledTimes(1)

    unsub()

    head.push({ title: 'Page 2' })
    renderDOMHead(head, { document: dom.window.document })
    expect(callback).toHaveBeenCalledTimes(1)
  })
})
