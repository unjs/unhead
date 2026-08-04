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
      instance.status = 'loaded'
      // trigger the hook to fire callbacks
      head.hooks.callHook('script:updated', { script: instance })
      instance.onLoaded(() => {
        resolve(true)
      })
    })).toBeTruthy()
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
    instance.status = 'loaded'
    // trigger the hook to fire callbacks
    head.hooks.callHook('script:updated', { script: instance })
    await new Promise<void>((resolve) => {
      instance.onLoaded(() => {
        calls.push('c')
        resolve()
      })
    })
    expect(calls).toMatchInlineSnapshot(`
      [
        "a",
        "c",
      ]
    `)
  })

  it('fires onLoaded when requestAnimationFrame is suspended', async () => {
    const originalRaf = globalThis.requestAnimationFrame
    globalThis.requestAnimationFrame = (() => 0) as any
    const onLoaded = vi.fn()

    try {
      const head = createHead()
      const instance = useScript(head, '/hidden-tab.js', {
        trigger: 'server',
      })
      instance.onLoaded(onLoaded)
      instance.status = 'loaded'
      await head.hooks.callHook('script:updated', { script: instance })
      await Promise.resolve()

      expect(onLoaded).toHaveBeenCalledOnce()
    }
    finally {
      globalThis.requestAnimationFrame = originalRaf
    }
  })

  it('releases keyed callback dedupe state when disposed', async () => {
    const head = createHead()
    const instance = useScript(head, '/keyed-callback.js', {
      trigger: 'server',
    })
    const calls: string[] = []

    const offFirst = instance.onLoaded(() => {
      calls.push('first')
    }, { key: 'once' }) as unknown as (() => void)
    offFirst()
    instance.onLoaded(() => {
      calls.push('second')
    }, { key: 'once' })

    instance.status = 'loaded'
    await head.hooks.callHook('script:updated', { script: instance })
    await instance._loadPromise

    expect(calls).toEqual(['second'])
  })

  it('disposes callbacks by identity', () => {
    const head = createHead()
    const instance = useScript(head, '/ordered-callbacks.js', {
      trigger: 'manual',
    })

    const offFirst = instance.onLoaded(() => {}) as unknown as (() => void)
    const offSecond = instance.onLoaded(() => {}) as unknown as (() => void)
    offFirst()
    offSecond()

    expect(instance._cbs.loaded).toHaveLength(0)
  })

  it('cleans trigger promises by identity', async () => {
    const head = createHead()
    let resolveFirst!: (value: boolean) => void
    let resolveSecond!: (value: boolean) => void
    const firstTrigger = new Promise<boolean>(resolve => resolveFirst = resolve)
    const secondTrigger = new Promise<boolean>(resolve => resolveSecond = resolve)

    const instance = useScript(head, '/ordered-triggers.js', { trigger: firstTrigger })
    useScript(head, '/ordered-triggers.js', { trigger: secondTrigger })

    const firstPromise = instance._triggerPromises![0]
    resolveFirst(false)
    await firstPromise
    expect(instance._triggerPromises).toHaveLength(1)

    const secondPromise = instance._triggerPromises![0]
    resolveSecond(false)
    await secondPromise
    expect(instance._triggerPromises).toHaveLength(0)
  })

  it('keeps removed scripts terminal', async () => {
    const head = createHead()
    const instance = useScript(head, '/removed-script.js', {
      trigger: 'manual',
    })

    expect(instance.remove()).toBe(false)
    await expect(instance._loadPromise).resolves.toBe(false)
    await expect(instance.load()).resolves.toBe(false)

    expect(instance.status).toBe('removed')
    expect(instance.entry).toBeUndefined()
    expect(head._scripts?.[instance.id]).toBeUndefined()
  })

  it('does not replay callbacks after removal', async () => {
    const head = createHead()
    const instance = useScript(head, '/removed-callback.js', {
      trigger: 'manual',
    })
    instance.remove()
    await instance._loadPromise

    const onLoaded = vi.fn()
    const onError = vi.fn()
    instance.onLoaded(onLoaded)
    instance.onError(onError)
    await Promise.resolve()

    expect(onLoaded).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('does not let a stale handle evict a replacement', async () => {
    const head = createHead()
    const first = useScript(head, '/replacement.js', { trigger: 'manual' })
    first.remove()
    await first._loadPromise

    const second = useScript(head, '/replacement.js', { trigger: 'manual' })
    first.remove()

    expect(head._scripts?.[second.id]).toBe(second)
  })

  it('stores special script ids as own registry entries', () => {
    const head = createHead()

    for (const key of ['constructor', 'toString', '__proto__']) {
      const instance = useScript(head, { key, src: `/${key}.js` }, { trigger: 'manual' })
      expect(Object.prototype.hasOwnProperty.call(head._scripts, key)).toBe(true)
      expect(head._scripts?.[key]).toBe(instance)
    }
  })

  it('ignores lifecycle updates from removed same-id scripts', async () => {
    const head = createHead()
    const first = useScript(head, '/same-id.js', { trigger: 'manual' })
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

    first.status = 'loaded'
    await head.hooks.callHook('script:updated', { script: first })
    await Promise.resolve()

    expect(second.status).toBe('loading')
    expect(onLoaded).not.toHaveBeenCalled()
  })

  it('drops settled trigger abort controllers', async () => {
    const head = createHead()
    let resolveTrigger!: (value: boolean) => void
    const trigger = new Promise<boolean>(resolve => resolveTrigger = resolve)
    const instance = useScript(head, '/settled-trigger.js', { trigger })

    const triggerPromise = instance._triggerPromises![0]
    resolveTrigger(false)
    await triggerPromise

    expect(instance._triggerAbortControllers?.size).toBe(0)
  })
})
