import type { UseScriptContextOptions } from '../../../src/scripts'
import { describe, expect, it, vi } from 'vitest'
// @vitest-environment jsdom
import { createHead } from '../../../src/client'
import { useScript } from '../../../src/scripts'
import { createHead as createServerHead } from '../../../src/server'

describe('source-less script loader', () => {
  it('coalesces loads and keeps a stable recording proxy', async () => {
    const greet = vi.fn()
    let api: { greet: (message: string) => void } | undefined
    const loader = vi.fn(async ({ signal }: UseScriptContextOptions) => {
      expect(signal).toBeInstanceOf(AbortSignal)
      api = { greet }
    })
    const script = useScript(createHead(), { key: 'module-sdk' }, {
      trigger: 'manual',
      loader,
      use: () => api,
    })
    const proxy = script.proxy
    proxy.greet('queued')

    const first = script.load()
    const second = script.load()

    expect(await first).toBe(api)
    expect(await second).toBe(api)
    expect(loader).toHaveBeenCalledOnce()
    expect(script.entry).toBeUndefined()
    expect(script.status).toBe('loaded')
    expect(script.proxy).toBe(proxy)
    expect(greet).toHaveBeenCalledWith('queued')

    proxy.greet('forwarded')
    expect(greet).toHaveBeenCalledWith('forwarded')
  })

  it('reports loader failures and aborts readiness', async () => {
    const error = new Error('module failed')
    const script = useScript(createHead(), { key: 'failed-module' }, {
      trigger: 'manual',
      loader: () => Promise.reject(error),
      use: () => ({ ready: true }),
    })
    const onError = vi.fn()
    script.onError(onError)

    await expect(script.load()).resolves.toBe(false)

    expect(script.status).toBe('error')
    expect(script.signal.aborted).toBe(true)
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('ignores a loader that settles after removal', async () => {
    const deferred = Promise.withResolvers<void>()
    const use = vi.fn(() => ({ ready: true }))
    const script = useScript(createHead(), { key: 'removed-module' }, {
      trigger: 'manual',
      loader: () => deferred.promise,
      use,
    })

    const loaded = script.load()
    script.remove()
    deferred.resolve()

    await expect(loaded).resolves.toBe(false)
    expect(script.status).toBe('removed')
    expect(use).toHaveBeenCalledOnce()
  })

  it('does not run or render source-less resources during SSR', () => {
    const loader = vi.fn()
    const use = vi.fn(() => ({ ready: true }))
    const head = createServerHead()
    const script = useScript(head, { key: 'server-module' }, {
      trigger: 'server',
      loader,
      use,
    })

    expect(loader).not.toHaveBeenCalled()
    expect(use).not.toHaveBeenCalled()
    expect(script.entry).toBeUndefined()
    expect(script.status).toBe('awaitingLoad')
  })

  it('types: requires a loader for source-less input', () => {
    const head = createServerHead()
    if (false) {
      // @ts-expect-error source-less scripts require a loader
      useScript(head, { key: 'missing-loader' })
    }
  })
})
