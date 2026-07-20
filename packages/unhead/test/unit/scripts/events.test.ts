import type { ScriptInstance } from '../../../src/scripts/types'
import { describe, expect, it, vi } from 'vitest'
// @vitest-environment jsdom
import { createHead } from '../../../src/client'
import { useScript } from '../../../src/composables'
import { createScriptWaitFor } from '../../../src/scripts/waitFor'

function markLoaded(head: any, script: any) {
  script.status = 'loaded'
  return head.hooks.callHook('script:updated', { script })
}

describe('useScript events', () => {
  it('keeps invoking legacy use() callbacks without arguments', () => {
    const head = createHead()
    const fallback = { ready: true }
    const use = vi.fn((root?: typeof fallback) => root || fallback)

    useScript(head, '/legacy-use.js', { use, trigger: 'manual' })

    expect(use).toHaveBeenCalledWith()
  })

  it('simple', async () => {
    const head = createHead()
    const instance = useScript(head, '/script.js', {
      trigger: 'server',
    })
    expect(await new Promise<true>((resolve) => {
      instance.onLoaded(() => {
        resolve(true)
      })
      // Trigger the hook to simulate the script being loaded
      markLoaded(head, instance)
    })).toBeTruthy()
  })
  it('fires onLoaded when requestAnimationFrame is suspended (hidden tab) - #771', async () => {
    // browsers suspend rAF callbacks entirely while a tab is hidden; stub it to a no-op
    const originalRaf = globalThis.requestAnimationFrame
    globalThis.requestAnimationFrame = (() => 0) as any
    try {
      const head = createHead()
      const instance = useScript(head, '/script.js', {
        trigger: 'server',
      })
      await expect(new Promise<true>((resolve) => {
        instance.onLoaded(() => {
          resolve(true)
        })
        markLoaded(head, instance)
      })).resolves.toBeTruthy()
    }
    finally {
      globalThis.requestAnimationFrame = originalRaf
    }
  })
  it('fires onLoaded registered after status=loaded when rAF is suspended (hidden tab) - #771', async () => {
    // late registrations are also gated behind the load promise resolving, so they must
    // not depend on requestAnimationFrame either
    const originalRaf = globalThis.requestAnimationFrame
    globalThis.requestAnimationFrame = (() => 0) as any
    try {
      const head = createHead()
      const instance = useScript(head, '/script.js', {
        trigger: 'server',
      })
      markLoaded(head, instance)
      // register after the load hook already fired
      await expect(new Promise<true>((resolve) => {
        instance.onLoaded(() => {
          resolve(true)
        })
      })).resolves.toBeTruthy()
    }
    finally {
      globalThis.requestAnimationFrame = originalRaf
    }
  })
  it('dedupe', async () => {
    const head = createHead()
    const instance = useScript(head, '/script.js', {
      trigger: 'server',
    })
    const calls: any[] = []
    instance.onLoaded(() => {
      calls.push('a')
    }, {
      key: 'once',
    })
    instance.onLoaded(() => {
      calls.push('b')
    }, {
      key: 'once',
    })
    await new Promise<void>((resolve) => {
      instance.onLoaded(() => {
        calls.push('c')
        resolve()
      })
      // Trigger the hook to simulate the script being loaded
      markLoaded(head, instance)
    })
    expect(calls).toMatchInlineSnapshot(`
      [
        "a",
        "c",
      ]
    `)
  })

  it('releases keyed callback dedupe state when disposed', async () => {
    const head = createHead()
    const instance = useScript(head, '/script.js', {
      trigger: 'server',
    })
    const calls: string[] = []

    const offA = instance.onLoaded(() => {
      calls.push('a')
    }, {
      key: 'once',
    })

    offA()

    instance.onLoaded(() => {
      calls.push('b')
    }, {
      key: 'once',
    })

    expect(instance._cbs.loaded).toHaveLength(1)
    markLoaded(head, instance)
    await instance._loadPromise

    expect(calls).toEqual(['b'])
  })

  it('returns a safe disposer for duplicate keyed callbacks', () => {
    const head = createHead()
    const instance = useScript(head, '/duplicate-key.js', {
      trigger: 'manual',
    })

    instance.onLoaded(() => {}, { key: 'once' })
    const offDuplicate = instance.onLoaded(() => {}, { key: 'once' })

    expect(offDuplicate).toBeTypeOf('function')
    expect(() => offDuplicate()).not.toThrow()
  })

  it('cleans onLoaded callbacks by identity when disposed out of order', () => {
    const head = createHead()
    const instance = useScript(head, '/script.js', {
      trigger: 'manual',
    })

    const offA = instance.onLoaded(() => {})
    const offB = instance.onLoaded(() => {})

    offA()
    offB()

    expect(instance._cbs.loaded).toHaveLength(0)
  })

  it('cleans trigger promises by identity when they settle out of order', async () => {
    const head = createHead()
    let resolveA!: (value: boolean) => void
    let resolveB!: (value: boolean) => void
    const triggerA = new Promise<boolean>(resolve => resolveA = resolve)
    const triggerB = new Promise<boolean>(resolve => resolveB = resolve)

    const instance = useScript(head, '/script.js', {
      trigger: triggerA,
    })
    useScript(head, '/script.js', {
      trigger: triggerB,
    })

    expect(instance._triggerPromises).toHaveLength(2)
    const firstTriggerPromise = instance._triggerPromises![0]
    resolveA(false)
    await firstTriggerPromise
    expect(instance._triggerPromises).toHaveLength(1)

    const secondTriggerPromise = instance._triggerPromises![0]
    resolveB(false)
    await secondTriggerPromise
    expect(instance._triggerPromises).toHaveLength(0)
  })

  it('removes unloaded manual scripts from the registry and releases callbacks', async () => {
    const head = createHead()
    const instance = useScript(head, '/script.js', {
      trigger: 'manual',
    })
    const calls: string[] = []

    instance.onLoaded(() => {
      calls.push('loaded')
    })
    instance.onError(() => {
      calls.push('error')
    })

    expect(head._scripts?.[instance.id]).toBe(instance)
    expect(instance.remove()).toBe(false)
    await expect(instance._loadPromise).resolves.toBe(false)

    expect(head._scripts?.[instance.id]).toBeUndefined()
    expect(instance.status).toBe('removed')
    expect(instance._cbs.loaded).toBeNull()
    expect(instance._cbs.error).toBeNull()
    expect(calls).toEqual([])
  })

  it('stores special script ids as own registry entries', () => {
    const head = createHead()
    useScript(head, '/script.js', {
      trigger: 'manual',
    })

    for (const key of ['constructor', 'toString', '__proto__']) {
      const instance = useScript(head, {
        key,
        src: `/${key}.js`,
      }, {
        trigger: 'manual',
      })

      expect(Object.hasOwn(head._scripts!, key)).toBe(true)
      expect(head._scripts?.[key]).toBe(instance)
    }
  })

  it('does not replay onLoaded or onError after the script was removed', async () => {
    const head = createHead()
    const instance = useScript(head, '/script.js', {
      trigger: 'manual',
    })

    instance.remove()
    await instance._loadPromise

    const calls: string[] = []
    instance.onLoaded(() => {
      calls.push('loaded')
    })
    instance.onError(() => {
      calls.push('error')
    })
    await Promise.resolve()

    // status is 'removed', so the immediate-replay path must not fire either callback
    expect(calls).toEqual([])
  })

  it('does not evict a newer same-id script when a stale handle calls remove again', async () => {
    const head = createHead()
    const first = useScript(head, '/script.js', {
      trigger: 'manual',
    })
    first.remove()
    await first._loadPromise

    // a fresh script registers under the same id after the first was removed
    const second = useScript(head, '/script.js', {
      trigger: 'manual',
    })
    expect(head._scripts?.[second.id]).toBe(second)

    // the stale handle removing again must not drop the new registration
    first.remove()
    expect(head._scripts?.[second.id]).toBe(second)
  })

  it('ignores late lifecycle updates from a removed same-id script', async () => {
    const head = createHead()
    const first = useScript(head, '/same-id.js', { trigger: 'manual' })
    first.load()
    const firstInput = (first as any).input
    first.remove()
    await first._loadPromise

    const api = { ready: true }
    const second = useScript(head, '/same-id.js', {
      trigger: 'manual',
      use: () => api,
    })
    const onLoaded = vi.fn()
    second.onLoaded(onLoaded)
    second.load()

    firstInput.onload(new Event('load'))
    await Promise.resolve()
    expect(first.status).toBe('removed')
    expect(second.status).toBe('loading')
    expect(onLoaded).not.toHaveBeenCalled()

    first.status = 'loaded'
    await head.hooks.callHook('script:updated', { script: first as unknown as ScriptInstance<object> })
    expect(second.status).toBe('loading')
    expect(onLoaded).not.toHaveBeenCalled()

    ;(second as any).input.onload(new Event('load'))
    await expect(second._loadPromise).resolves.toBe(api)
    expect(onLoaded).toHaveBeenCalledWith(api)
  })

  it('drops settled trigger abort controllers from the set', async () => {
    const head = createHead()
    let resolveTrigger!: (value: boolean) => void
    const trigger = new Promise<boolean>(resolve => resolveTrigger = resolve)
    const instance = useScript(head, '/script.js', {
      trigger,
    })

    expect(instance._triggerAbortControllers?.size).toBe(1)
    const triggerPromise = instance._triggerPromises![0]
    resolveTrigger(false)
    await triggerPromise
    await Promise.resolve()

    expect(instance._triggerAbortControllers?.size).toBe(0)
  })

  it('returns a disposer for an individual trigger registration', async () => {
    const head = createHead()
    const first = Promise.withResolvers<void>()
    const second = Promise.withResolvers<void>()
    const instance = useScript(head, '/disposable-trigger.js', {
      trigger: 'manual',
    })

    const offFirst = instance.setupTriggerHandler(first.promise)
    instance.setupTriggerHandler(second.promise)
    offFirst()
    first.resolve()
    await new Promise(resolve => setTimeout(resolve))

    expect(instance.status).toBe('awaitingLoad')

    second.resolve()
    await vi.waitFor(() => expect(instance.status).toBe('loading'))
  })

  it('cleans function triggers when loading starts', () => {
    const head = createHead()
    const cleanup = vi.fn()
    let load!: () => void
    const instance = useScript(head, '/function-trigger.js', {
      trigger: (fn) => {
        load = fn
        return cleanup
      },
    })

    expect(instance._triggerAbortController?.signal.aborted).toBe(false)
    load()

    expect(cleanup).toHaveBeenCalledOnce()
    expect(instance._triggerAbortControllers?.size).toBe(0)
  })

  it('cleans function triggers that load synchronously', () => {
    const head = createHead()
    const cleanup = vi.fn()
    const instance = useScript(head, '/sync-function-trigger.js', {
      trigger: (load) => {
        load()
        return cleanup
      },
    })

    expect(cleanup).toHaveBeenCalledOnce()
    expect(instance._triggerAbortControllers?.size).toBe(0)
  })

  it('ignores non-callable function trigger cleanup values', () => {
    const head = createHead()

    expect(() => useScript(head, '/invalid-function-cleanup.js', {
      trigger: ((load: () => void) => {
        load()
        return Promise.resolve()
      }) as any,
    })).not.toThrow()

    const script = head._scripts?.['/invalid-function-cleanup.js'] as { status?: string } | undefined
    expect(script?.status).toBe('loading')
  })

  it('removes partial lifecycle state when a function trigger throws', () => {
    const head = createHead()
    let signal!: AbortSignal

    expect(() => {
      useScript(head, '/failed-function-trigger.js', {
        resolve: (ctx) => {
          signal = ctx.signal
          return new Promise<Record<string, never>>(() => {})
        },
        trigger: (load) => {
          load()
          throw new Error('trigger setup failed')
        },
      })
    }).toThrow('trigger setup failed')

    expect(signal.aborted).toBe(true)
    expect(head._scripts?.['/failed-function-trigger.js']).toBeUndefined()
    expect(document.querySelector('script[src="/failed-function-trigger.js"]')).toBeNull()
  })

  it('waits for an async use() result before resolving load and firing onLoaded', async () => {
    const head = createHead()
    const { promise, resolve } = Promise.withResolvers<{ ready: true }>()
    const instance = useScript(head, '/async-script.js', {
      trigger: 'server',
      use: () => promise,
    })
    const onLoaded = vi.fn()
    instance.onLoaded(onLoaded)

    markLoaded(head, instance)
    await Promise.resolve()
    expect(onLoaded).not.toHaveBeenCalled()

    const api = { ready: true as const }
    resolve(api)
    await expect(instance._loadPromise).resolves.toBe(api)
    expect(onLoaded).toHaveBeenCalledOnce()
    expect(onLoaded).toHaveBeenCalledWith(api)
  })

  it('isolates callback errors and releases terminal callbacks', async () => {
    const head = createHead()
    const error = new Error('callback failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const instance = useScript(head, '/callback-error.js', {
      trigger: 'server',
      use: () => ({ ready: true }),
    })
    const afterError = vi.fn()
    instance.onLoaded(() => {
      throw error
    })
    instance.onLoaded(afterError)

    markLoaded(head, instance)
    await instance._loadPromise
    await Promise.resolve()

    expect(consoleError).toHaveBeenCalledWith(error)
    expect(afterError).toHaveBeenCalledOnce()
    expect(instance._cbs.loaded).toBeNull()
    expect(instance._cbs.error).toBeNull()
    consoleError.mockRestore()
  })

  it('owns waitFor readiness cleanup', async () => {
    const head = createHead()
    const cleanup = vi.fn()
    let resolveReady!: (api: { ready: true }) => void
    const instance = useScript(head, '/wait-for-script.js', {
      trigger: 'server',
      resolve: ({ waitFor }) => waitFor<{ ready: true }>((resolve) => {
        resolveReady = resolve
        return cleanup
      }),
    })

    markLoaded(head, instance)
    const api = { ready: true as const }
    resolveReady(api)

    await expect(instance._loadPromise).resolves.toBe(api)
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('resolves when waitFor setup returns the resolved API', async () => {
    const head = createHead()
    const api = { ready: true as const }
    const instance = useScript(head, '/returned-wait-for-script.js', {
      trigger: 'server',
      resolve: ({ waitFor }) => waitFor(resolve => resolve(api)),
    })

    markLoaded(head, instance)

    await expect(instance._loadPromise).resolves.toBe(api)
  })

  it('does not invoke a resolved function as cleanup', async () => {
    const api = vi.fn()
    const waitFor = createScriptWaitFor(new AbortController().signal)

    await expect(waitFor<typeof api>(resolve => resolve(api))).resolves.toBe(api)
    expect(api).not.toHaveBeenCalled()
  })

  it('aborts waitFor while it adopts a pending promise', async () => {
    const head = createHead()
    const cleanup = vi.fn()
    const readiness = Promise.withResolvers<{ ready: true }>()
    const instance = useScript(head, '/aborted-wait-for-script.js', {
      trigger: 'server',
      resolve: ({ waitFor }) => waitFor<{ ready: true }>((resolve) => {
        resolve(readiness.promise)
        return cleanup
      }),
    })

    markLoaded(head, instance)
    instance.remove()

    await expect(instance._loadPromise).resolves.toBe(false)
    expect(cleanup).toHaveBeenCalledOnce()
    readiness.resolve({ ready: true })
    await readiness.promise
    expect(instance.status).toBe('removed')
  })

  it('aborts async use() and ignores late readiness when removed', async () => {
    const head = createHead()
    const { promise, resolve } = Promise.withResolvers<{ ready: true }>()
    let signal!: AbortSignal
    const instance = useScript(head, '/removed-async-script.js', {
      trigger: 'server',
      resolve: (ctx) => {
        signal = ctx.signal
        return promise
      },
    })
    const onLoaded = vi.fn()
    instance.onLoaded(onLoaded)

    markLoaded(head, instance)
    instance.remove()

    expect(signal.aborted).toBe(true)
    await expect(instance._loadPromise).resolves.toBe(false)
    resolve({ ready: true })
    await Promise.resolve()
    expect(onLoaded).not.toHaveBeenCalled()
  })

  it('routes async use() rejection through the script error lifecycle', async () => {
    const head = createHead()
    const error = new Error('SDK readiness failed')
    const instance = useScript(head, '/failed-async-script.js', {
      trigger: 'server',
      use: async () => {
        throw error
      },
    })
    const onError = vi.fn()
    instance.onError(onError)

    markLoaded(head, instance)
    await expect(instance._loadPromise).resolves.toBe(false)
    expect(instance.status).toBe('error')
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('routes falsy async rejection reasons through the script error lifecycle', async () => {
    const head = createHead()
    const { promise, reject } = Promise.withResolvers<Record<string, never>>()
    const instance = useScript(head, '/failed-falsy-script.js', {
      trigger: 'server',
      use: () => promise,
    })
    const onError = vi.fn()
    instance.onError(onError)

    markLoaded(head, instance)
    reject(undefined)
    await expect(instance._loadPromise).resolves.toBe(false)
    expect(instance.status).toBe('error')
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'undefined' }))
  })

  it('fails when async use() resolves without an API and replays the error', async () => {
    const head = createHead()
    const instance = useScript(head, '/missing-async-api.js', {
      trigger: 'server',
      use: async () => undefined,
    })

    markLoaded(head, instance)
    await expect(instance._loadPromise).resolves.toBe(false)

    const onError = vi.fn()
    instance.onError(onError)
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: 'use() resolved without a script API',
    }))
  })

  it('routes synchronous use() failures through the script error lifecycle', async () => {
    const head = createHead()
    const error = new Error('SDK adapter failed')
    const instance = useScript(head, '/failed-sync-script.js', {
      trigger: 'server',
      use: () => {
        throw error
      },
    })
    const onError = vi.fn()
    instance.onError(onError)

    markLoaded(head, instance)
    await expect(instance._loadPromise).resolves.toBe(false)
    expect(instance.status).toBe('error')
    expect(onError).toHaveBeenCalledWith(error)
  })
})
