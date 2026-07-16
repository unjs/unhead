import { describe, expect, it, vi } from 'vitest'
// @vitest-environment jsdom
import { createHead } from '../../../src/client'
import { useScript, useScriptScope } from '../../../src/scripts'

describe('script scope', () => {
  it('keeps the shared script while owning callbacks and triggers per consumer', async () => {
    const head = createHead()
    const cleanupA = vi.fn()
    const cleanupB = vi.fn()
    const loadedA = vi.fn()
    const loadedB = vi.fn()

    const scopeA = useScriptScope(head, '/shared.js', {
      trigger: () => cleanupA,
    })
    const scopeB = useScriptScope(head, '/shared.js', {
      trigger: () => cleanupB,
    })
    scopeA.onLoaded(loadedA)
    scopeB.onLoaded(loadedB)

    expect(scopeA).not.toBe(scopeB)
    expect(scopeA.script).toBe(scopeB.script)
    expect(head._scripts?.['/shared.js']).toBe(scopeA.script)

    scopeA.dispose()

    expect(scopeA.signal.aborted).toBe(true)
    expect(scopeB.signal.aborted).toBe(false)
    expect(scopeA.script.signal.aborted).toBe(false)
    expect(cleanupA).toHaveBeenCalledOnce()
    expect(cleanupB).not.toHaveBeenCalled()

    scopeB.load()
    head.hooks.callHook('script:updated', { script: { id: scopeB.id, status: 'loaded' } as any })
    await scopeB.script._loadPromise

    expect(loadedA).not.toHaveBeenCalled()
    expect(loadedB).toHaveBeenCalledOnce()
    expect(cleanupB).toHaveBeenCalledOnce()
  })

  it('disposes all scopes when the shared script is removed', async () => {
    const head = createHead()
    const script = useScript(head, '/shared.js', { trigger: 'manual' })
    const scopeA = script.createScope()
    const scopeB = script.createScope()

    script.remove()
    await script._loadPromise
    await Promise.resolve()

    expect(scopeA.disposed).toBe(true)
    expect(scopeB.disposed).toBe(true)
    expect(scopeA.signal.aborted).toBe(true)
    expect(scopeB.signal.aborted).toBe(true)
  })

  it('emits scoped errors before releasing an aborted script scope', async () => {
    const head = createHead()
    const scope = useScriptScope(head, '/failed.js', { trigger: 'manual' })
    const onError = vi.fn()
    scope.onError(onError)

    scope.load()
    const errorEvent = new Event('error')
    const entry = (scope.script as any).input
    entry.onerror?.(errorEvent)
    await scope.script._loadPromise
    await Promise.resolve()

    expect(onError).toHaveBeenCalledOnce()
    expect(scope.disposed).toBe(true)
  })

  it('runs effect cleanup once when its scope is disposed', async () => {
    const head = createHead()
    const script = useScript(head, '/effect.js', { trigger: 'manual' })
    const scope = script.createScope()
    const cleanup = vi.fn()
    let effectSignal!: AbortSignal

    scope.onLoadedEffect((_api, { signal }) => {
      effectSignal = signal
      return cleanup
    })

    script.load()
    head.hooks.callHook('script:updated', { script: { id: script.id, status: 'loaded' } as any })
    await script._loadPromise
    await Promise.resolve()

    scope.dispose()
    scope.dispose()

    expect(effectSignal.aborted).toBe(true)
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('reports disposer errors without throwing from teardown', () => {
    const head = createHead()
    const script = useScript(head, '/cleanup-error.js', { trigger: 'manual' })
    const scope = script.createScope()
    const error = new Error('cleanup failed')
    const reportError = vi.fn()
    const errorGlobal = globalThis as unknown as { reportError?: (error: unknown) => void }
    const originalReportError = errorGlobal.reportError
    const hadOwnReportError = Object.hasOwn(globalThis, 'reportError')
    errorGlobal.reportError = reportError

    try {
      script._setupTriggerHandler = () => () => {
        throw error
      }
      scope.setupTriggerHandler('manual')

      expect(() => scope.dispose()).not.toThrow()
      expect(reportError).toHaveBeenCalledWith(error)
    }
    finally {
      if (hadOwnReportError)
        errorGlobal.reportError = originalReportError
      else
        delete errorGlobal.reportError
    }
  })

  it('adopts late async effect cleanup after disposal', async () => {
    const head = createHead()
    const script = useScript(head, '/async-effect.js', { trigger: 'manual' })
    const scope = script.createScope()
    const cleanup = vi.fn()
    const started = Promise.withResolvers<void>()
    const setup = Promise.withResolvers<() => void>()

    scope.onLoadedEffect(async (_api, { signal }) => {
      started.resolve()
      expect(signal.aborted).toBe(false)
      return setup.promise
    })

    script.load()
    head.hooks.callHook('script:updated', { script: { id: script.id, status: 'loaded' } as any })
    await started.promise

    scope.dispose()
    setup.resolve(cleanup)
    await vi.waitFor(() => expect(cleanup).toHaveBeenCalledOnce())
  })

  it('treats abort rejection as expected effect cancellation', async () => {
    const head = createHead()
    const script = useScript(head, '/cancelled-effect.js', { trigger: 'manual' })
    const scope = script.createScope()
    const started = Promise.withResolvers<void>()
    const onError = vi.fn()

    scope.onLoadedEffect((_api, { signal }) => new Promise<void>((_resolve, reject) => {
      started.resolve()
      signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true })
    }), { onError })

    script.load()
    head.hooks.callHook('script:updated', { script: { id: script.id, status: 'loaded' } as any })
    await started.promise
    scope.dispose()
    await Promise.resolve()

    expect(onError).not.toHaveBeenCalled()
  })

  it('does not replay callbacks registered after disposal', async () => {
    const head = createHead()
    const script = useScript(head, '/loaded.js', { trigger: 'manual' })
    const scope = script.createScope()

    script.load()
    head.hooks.callHook('script:updated', { script: { id: script.id, status: 'loaded' } as any })
    await script._loadPromise
    scope.dispose()

    const loaded = vi.fn()
    const off = scope.onLoaded(loaded)

    expect(off).toBeTypeOf('function')
    expect(loaded).not.toHaveBeenCalled()
  })

  it('does not remove a shared script when one scope trigger throws', () => {
    const head = createHead()
    const script = useScript(head, '/shared-trigger.js', { trigger: 'manual' })

    expect(() => useScriptScope(head, '/shared-trigger.js', {
      trigger: () => {
        throw new Error('scope trigger failed')
      },
    })).toThrow('scope trigger failed')

    expect(head._scripts?.['/shared-trigger.js']).toBe(script)
    expect(script.signal.aborted).toBe(false)
    expect(script.status).toBe('awaitingLoad')
    expect(script._triggerAbortControllers?.size).toBe(0)
  })
})
