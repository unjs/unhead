import { renderDOMHead } from '@unhead/dom'
import { describe, expect, it, vi } from 'vitest'
import { useHead } from '../../../src'
import { useDOMHead } from '../../util'

describe('onRendered option', () => {
  it('calls onRendered callback after DOM render', async () => {
    const head = useDOMHead()
    const onRendered = vi.fn()

    useHead(head, { title: 'Hello World' }, { onRendered })

    await renderDOMHead(head, { document: head.resolvedOptions.document! })

    expect(onRendered).toHaveBeenCalledOnce()
  })

  it('callback receives renders context with tags', async () => {
    const head = useDOMHead()
    let capturedCtx: any

    useHead(head, { title: 'Test Page' }, {
      onRendered(ctx) {
        capturedCtx = ctx
      },
    })

    await renderDOMHead(head, { document: head.resolvedOptions.document! })

    expect(capturedCtx).toBeDefined()
    expect(capturedCtx.renders).toBeInstanceOf(Array)
    const titleRender = capturedCtx.renders.find((r: any) => r.tag.tag === 'title')
    expect(titleRender).toBeDefined()
    expect(titleRender.tag.textContent).toBe('Test Page')
  })

  it('fires on every render', async () => {
    const head = useDOMHead()
    const onRendered = vi.fn()

    useHead(head, { title: 'Initial' }, { onRendered })

    await renderDOMHead(head, { document: head.resolvedOptions.document! })
    expect(onRendered).toHaveBeenCalledTimes(1)

    head.push({ title: 'Updated' })
    await renderDOMHead(head, { document: head.resolvedOptions.document! })
    expect(onRendered).toHaveBeenCalledTimes(2)
  })

  it('stops firing after dispose', async () => {
    const head = useDOMHead()
    const onRendered = vi.fn()

    const entry = useHead(head, { title: 'Page' }, { onRendered })

    await renderDOMHead(head, { document: head.resolvedOptions.document! })
    expect(onRendered).toHaveBeenCalledTimes(1)

    entry.dispose()

    head.push({ title: 'Page 2' })
    await renderDOMHead(head, { document: head.resolvedOptions.document! })
    expect(onRendered).toHaveBeenCalledTimes(1)
  })

  it('is ignored during SSR', async () => {
    const { createHead } = await import('../../../src/server')
    const head = createHead({ disableDefaults: true })
    const onRendered = vi.fn()

    useHead(head, { title: 'SSR Page' }, { onRendered })

    await head.render()
    expect(onRendered).not.toHaveBeenCalled()
  })

  it('works with multiple entries each having onRendered', async () => {
    const head = useDOMHead()
    const onRendered1 = vi.fn()
    const onRendered2 = vi.fn()

    useHead(head, { title: 'Page' }, { onRendered: onRendered1 })
    useHead(head, { meta: [{ name: 'description', content: 'test' }] }, { onRendered: onRendered2 })

    await renderDOMHead(head, { document: head.resolvedOptions.document! })

    expect(onRendered1).toHaveBeenCalledOnce()
    expect(onRendered2).toHaveBeenCalledOnce()
  })

  it('disposing one entry does not affect other onRendered callbacks', async () => {
    const head = useDOMHead()
    const onRendered1 = vi.fn()
    const onRendered2 = vi.fn()

    const entry1 = useHead(head, { title: 'Page' }, { onRendered: onRendered1 })
    useHead(head, { meta: [{ name: 'description', content: 'test' }] }, { onRendered: onRendered2 })

    await renderDOMHead(head, { document: head.resolvedOptions.document! })
    expect(onRendered1).toHaveBeenCalledTimes(1)
    expect(onRendered2).toHaveBeenCalledTimes(1)

    entry1.dispose()

    head.push({ title: 'Page 2' })
    await renderDOMHead(head, { document: head.resolvedOptions.document! })
    expect(onRendered1).toHaveBeenCalledTimes(1) // stopped
    expect(onRendered2).toHaveBeenCalledTimes(2) // still fires
  })
})
