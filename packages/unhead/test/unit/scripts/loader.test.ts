import type { UseScriptInput, UseScriptOptions } from '../../../src/scripts'
import { describe, expect, it, vi } from 'vitest'
// @vitest-environment jsdom
import { createHead } from '../../../src/client'
import { useScript } from '../../../src/scripts'
import { createHead as createServerHead } from '../../../src/server'

describe('source-less script loader', () => {
  it('coalesces loads and keeps a stable recording proxy', async () => {
    const greet = vi.fn()
    const api = { greet }
    const loader = vi.fn(async ({ signal }) => {
      expect(signal).toBeInstanceOf(AbortSignal)
      return api
    })
    const script = useScript(createHead(), { key: 'module-sdk' }, {
      trigger: 'manual',
      loader,
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

  it('forwards re-entrant calls made while recordings replay', async () => {
    const calls: string[] = []
    const script = useScript(createHead(), { key: 'reentrant-sdk' }, {
      trigger: 'manual',
      loader: () => ({
        init: (cb: () => void) => {
          calls.push('init')
          cb()
        },
        track: () => calls.push('track'),
      }),
    })

    script.proxy.init(() => script.proxy.track())
    await script.load()

    expect(calls).toEqual(['init', 'track'])
  })

  it('does not use a synchronous SDK stub as the stable proxy target', async () => {
    let loaded = false
    const script = useScript(createHead(), '/frozen-stub.js', {
      trigger: 'manual',
      use: () => loaded ? { ready: true } : Object.freeze({ ready: false }),
    })
    const proxy = script.proxy

    loaded = true
    const loading = script.load()
    ;(script as any).input.onload?.(new Event('load'))
    await loading

    expect(proxy.ready).toBe(true)
    expect(script.proxy).toBe(proxy)
  })

  it('uses the loader when an optional src is undefined', async () => {
    const loader = vi.fn(() => ({ ready: true }))
    const script = useScript(createHead(), { key: 'undefined-src', src: undefined }, {
      trigger: 'manual',
      loader,
    })

    await script.load()

    expect(loader).toHaveBeenCalledOnce()
    expect(script.entry).toBeUndefined()
  })

  it('continues loaded callbacks when a recorded SDK call throws', async () => {
    const error = new Error('queued call failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const script = useScript(createHead(), { key: 'throwing-sdk' }, {
      trigger: 'manual',
      loader: () => ({ boom: () => { throw error } }),
    })
    const onLoaded = vi.fn()
    script.proxy.boom()
    script.onLoaded(onLoaded)

    await script.load()
    await Promise.resolve()

    expect(consoleError).toHaveBeenCalledWith(error)
    expect(onLoaded).toHaveBeenCalledOnce()
    expect(script._cbs.loaded).toBeNull()
    consoleError.mockRestore()
  })

  it('reports loader failures and aborts readiness', async () => {
    const error = new Error('module failed')
    const script = useScript(createHead(), { key: 'failed-module' }, {
      trigger: 'manual',
      loader: () => Promise.reject(error),
    })
    const onError = vi.fn()
    script.onError(onError)

    await expect(script.load()).resolves.toBe(false)

    expect(script.status).toBe('error')
    expect(script.signal.aborted).toBe(true)
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('ignores a loader that settles after removal', async () => {
    const deferred = Promise.withResolvers<{ ready: true }>()
    const script = useScript(createHead(), { key: 'removed-module' }, {
      trigger: 'manual',
      loader: () => deferred.promise,
    })

    const loaded = script.load()
    script.remove()
    deferred.resolve({ ready: true })

    await expect(loaded).resolves.toBe(false)
    expect(script.status).toBe('removed')
  })

  it('does not run or render source-less resources during SSR', () => {
    const loader = vi.fn(() => ({ ready: true }))
    const head = createServerHead()
    const script = useScript(head, { key: 'server-module' }, {
      trigger: 'server',
      loader,
    })

    expect(loader).not.toHaveBeenCalled()
    expect(script.entry).toBeUndefined()
    expect(script.status).toBe('awaitingLoad')
  })

  it('forwards proxy operations to the loaded SDK with the correct receiver', async () => {
    class Sdk {
      #count = 0
      label = 'sdk'

      increment() {
        this.#count++
      }

      count() {
        return this.#count
      }
    }
    const api = new Sdk()
    const script = useScript(createHead(), { key: 'stateful-sdk' }, {
      trigger: 'manual',
      loader: () => api,
    })
    const proxy = script.proxy as any

    proxy.increment()
    await script.load()
    proxy.increment()
    proxy.label = 'updated'
    Object.defineProperty(proxy, 'extra', { configurable: true, enumerable: true, value: 1 })

    expect(api.count()).toBe(2)
    expect(api.label).toBe('updated')
    expect('label' in proxy).toBe(true)
    expect(Object.keys(proxy)).toContain('extra')
    expect(delete proxy.extra).toBe(true)
    expect('extra' in api).toBe(false)
    expect(script.proxy).toBe(proxy)
  })

  it('uses DOM transport when a loader is passed with a URL at runtime', () => {
    const loader = vi.fn(() => ({ ready: true }))
    const script = useScript(createHead(), '/url-script.js', {
      loader,
      trigger: 'manual',
    } as any)

    script.load()

    expect(loader).not.toHaveBeenCalled()
    expect(script.entry).toBeDefined()
  })

  it('types: requires a loader for source-less input', () => {
    const head = createServerHead()
    const wrap = (input: UseScriptInput, options?: UseScriptOptions) => useScript(head, input, options)

    wrap('/wrapped.js')
    if (false) {
      // @ts-expect-error source-less scripts require a loader
      useScript(head, { key: 'missing-loader' })
      // @ts-expect-error the loader owns source-less API resolution
      useScript(head, { key: 'duplicate-readiness' }, { loader: () => ({ ready: true }), use: () => ({ ready: true }) })
      // @ts-expect-error loaders are only valid with source-less input
      useScript(head, '/loader-with-url.js', { loader: () => ({ ready: true }) })
      // @ts-expect-error the released input alias remains source-based
      const input: UseScriptInput = { key: 'source-less' }
      void input
    }
  })
})
