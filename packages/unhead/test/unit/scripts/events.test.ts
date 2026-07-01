import { describe, expect, it } from 'vitest'
// @vitest-environment jsdom
import { createHead } from '../../../src/client'
import { useScript } from '../../../src/composables'

describe('useScript events', () => {
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
      head.hooks.callHook('script:updated', { script: { id: instance.id, status: 'loaded' } as any })
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
        head.hooks.callHook('script:updated', { script: { id: instance.id, status: 'loaded' } as any })
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
      head.hooks.callHook('script:updated', { script: { id: instance.id, status: 'loaded' } as any })
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
      head.hooks.callHook('script:updated', { script: { id: instance.id, status: 'loaded' } as any })
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
    }) as unknown as (() => void) | undefined

    offA?.()

    instance.onLoaded(() => {
      calls.push('b')
    }, {
      key: 'once',
    })

    expect(instance._cbs.loaded).toHaveLength(1)
    head.hooks.callHook('script:updated', { script: { id: instance.id, status: 'loaded' } as any })
    await instance._loadPromise

    expect(calls).toEqual(['b'])
  })

  it('cleans onLoaded callbacks by identity when disposed out of order', () => {
    const head = createHead()
    const instance = useScript(head, '/script.js', {
      trigger: 'manual',
    })

    const offA = instance.onLoaded(() => {}) as unknown as (() => void) | undefined
    const offB = instance.onLoaded(() => {}) as unknown as (() => void) | undefined

    offA?.()
    offB?.()

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
})
