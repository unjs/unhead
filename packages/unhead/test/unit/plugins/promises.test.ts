import { describe, expect, it, vi } from 'vitest'
import { PromisesPlugin } from '../../../src/plugins/promises'
import { createHead, renderSSRHead } from '../../../src/server'

describe('PromisesPlugin', () => {
  it('does not defer later entries:resolve listeners', () => {
    const head = createHead({
      disableDefaults: true,
      plugins: [PromisesPlugin],
    })
    const listener = vi.fn()
    head.hooks.hook('entries:resolve', listener)
    head.push({ title: Promise.resolve('resolved') } as any)

    renderSSRHead(head)

    expect(listener).toHaveBeenCalledOnce()
  })

  it('keeps rejected entries available for retry without an unhandled rejection', async () => {
    const head = createHead({
      disableDefaults: true,
      plugins: [PromisesPlugin],
    })
    const rejected = Promise.reject(new Error('failed'))
    head.push({ title: rejected } as any)

    renderSSRHead(head)
    await rejected.catch(() => {})
    await Promise.resolve()

    const entry = head.entries.values().next().value
    expect(entry?._promisesProcessed).toBe(false)
  })
})
