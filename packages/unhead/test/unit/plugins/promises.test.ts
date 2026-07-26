import { describe, expect, it, vi } from 'vitest'
import { createHead as createClientHead } from '../../../src/client'
import { createServerHead as createLegacyServerHead, legacyPlugins } from '../../../src/legacy'
import { PromisesPlugin } from '../../../src/plugins/promises'
import { createHead as createServerHead, renderSSRHead } from '../../../src/server'
import { useDom } from '../../util'

async function flushPromises() {
  await new Promise<void>(resolve => setTimeout(resolve, 0))
}

describe('promisesPlugin', () => {
  it('remains enabled by the legacy entrypoints', async () => {
    expect(legacyPlugins).toContain(PromisesPlugin)
    const head = createLegacyServerHead({ disableDefaults: true })
    head.push({ title: Promise.resolve('legacy') } as any)

    expect(renderSSRHead(head).headTags).not.toContain('<title>')
    await flushPromises()
    expect(renderSSRHead(head).headTags).toContain('<title>legacy</title>')
  })

  it('keeps later resolve listeners synchronous', () => {
    const head = createServerHead({
      disableDefaults: true,
      plugins: [PromisesPlugin],
    })
    const listener = vi.fn()
    head.hooks.hook('entries:resolve', listener)
    head.push({ title: Promise.resolve('resolved') } as any)

    renderSSRHead(head)

    expect(listener).toHaveBeenCalledOnce()
  })

  it('omits pending entries until a later server render', async () => {
    const head = createServerHead({
      disableDefaults: true,
      plugins: [PromisesPlugin],
    })
    head.push({ title: Promise.resolve('resolved') } as any)

    expect(renderSSRHead(head).headTags).not.toContain('<title>')
    await flushPromises()
    expect(renderSSRHead(head).headTags).toContain('<title>resolved</title>')
  })

  it('retries rejected thenables on a later server render', async () => {
    const head = createServerHead({
      disableDefaults: true,
      plugins: [PromisesPlugin],
    })
    let attempts = 0
    const retryingThenable = {
      then(resolve: (value: string) => void, reject: (reason: Error) => void) {
        attempts++
        attempts === 1 ? reject(new Error('failed')) : resolve('recovered')
      },
    }
    head.push({ title: retryingThenable } as any)

    expect(renderSSRHead(head).headTags).not.toContain('<title>')
    await flushPromises()
    expect(attempts).toBe(1)

    expect(renderSSRHead(head).headTags).not.toContain('<title>')
    await flushPromises()
    expect(attempts).toBe(2)
    expect(renderSSRHead(head).headTags).toContain('<title>recovered</title>')
  })

  it('invalidates the client after promises resolve', async () => {
    const dom = useDom()
    const head = createClientHead({
      document: dom.window.document,
      plugins: [PromisesPlugin],
    })
    head.push({ title: Promise.resolve('resolved') } as any)

    expect(dom.window.document.title).toBe('')
    await flushPromises()
    expect(dom.window.document.title).toBe('resolved')
  })

  it('ignores stale resolutions after an entry is patched', async () => {
    let resolveFirst!: (value: string) => void
    const first = new Promise<string>((resolve) => {
      resolveFirst = resolve
    })
    const dom = useDom()
    const head = createClientHead({
      document: dom.window.document,
      plugins: [PromisesPlugin],
    })
    const entry = head.push({ title: first } as any)
    entry.patch({ title: Promise.resolve('second') } as any)

    await flushPromises()
    resolveFirst('first')
    await flushPromises()

    expect(dom.window.document.title).toBe('second')
  })
})
