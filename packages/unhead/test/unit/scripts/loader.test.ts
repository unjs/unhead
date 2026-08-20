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
    const script = useScript(createHead(), { key: 'module-sdk', loader }, {
      trigger: 'manual',
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
    const script = useScript(createHead(), {
      key: 'reentrant-sdk',
      loader: () => ({
        init: (cb: () => void) => {
          calls.push('init')
          cb()
        },
        track: () => calls.push('track'),
      }),
    }, {
      trigger: 'manual',
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
    const script = useScript(createHead(), { key: 'undefined-src', src: undefined, loader }, {
      trigger: 'manual',
    })

    await script.load()

    expect(loader).toHaveBeenCalledOnce()
    expect(script.entry).toBeUndefined()
  })

  it('continues loaded callbacks when a recorded SDK call throws', async () => {
    const error = new Error('queued call failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const script = useScript(createHead(), {
      key: 'throwing-sdk',
      loader: () => ({ boom: () => { throw error } }),
    }, {
      trigger: 'manual',
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
    const script = useScript(createHead(), {
      key: 'failed-module',
      loader: () => Promise.reject(error),
    }, {
      trigger: 'manual',
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
    const script = useScript(createHead(), {
      key: 'removed-module',
      loader: () => deferred.promise,
    }, {
      trigger: 'manual',
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
    const script = useScript(head, { key: 'server-module', loader }, {
      trigger: 'server',
    })

    expect(loader).not.toHaveBeenCalled()
    expect(script.entry).toBeUndefined()
    expect(script.status).toBe('awaitingLoad')
  })

  it('forwards proxy operations to the loaded SDK with the correct receiver', async () => {
    let count = 0
    const branded = new WeakSet<object>()
    const api = {
      label: 'sdk',
      increment() {
        if (!branded.has(this))
          throw new TypeError('Illegal invocation')
        count++
      },
      count() {
        return count
      },
    }
    branded.add(api)
    const script = useScript(createHead(), {
      key: 'stateful-sdk',
      loader: () => api,
    }, {
      trigger: 'manual',
    })
    const proxy = script.proxy as any

    proxy.increment()
    const loaded = await script.load()
    proxy.increment()
    loaded.label = 'updated'

    expect(api.count()).toBe(2)
    expect(api.label).toBe('updated')
    expect(script.proxy).toBe(proxy)
  })

  it('uses DOM transport for inline scripts', () => {
    const script = useScript(createHead(), { key: 'inline-script', textContent: 'window.inline = true' } as any, {
      trigger: 'manual',
    })

    script.load()

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
      useScript(head, { key: 'duplicate-readiness', loader: () => ({ ready: true }) }, { use: () => ({ ready: true }) })
      // @ts-expect-error loaders are only valid with source-less input
      useScript(head, { src: '/loader-with-url.js', loader: () => ({ ready: true }) })
      // @ts-expect-error loader is part of the resource input, not lifecycle options
      useScript(head, '/loader-in-options.js', { loader: () => ({ ready: true }) })
      // @ts-expect-error the released input alias remains source-based
      const input: UseScriptInput = { key: 'source-less' }
      void input
    }
  })
})
