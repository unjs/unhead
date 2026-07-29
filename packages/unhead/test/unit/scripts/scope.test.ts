import type { ScriptInstance } from '../../../src/scripts/types'
import { describe, expect, it, vi } from 'vitest'
// @vitest-environment jsdom
import { createHead } from '../../../src/client'
import { useScript } from '../../../src/scripts'

describe('script scope', () => {
  it('preserves the cached instance unless consumer ownership is requested', () => {
    const head = createHead()
    const first = useScript(head, '/identity.js', { trigger: 'manual' })
    ;(first as any).reload = vi.fn()
    const second = useScript(head, '/identity.js', { trigger: 'manual' })

    expect(second).toBe(first)
    expect((second as any).reload).toBe((first as any).reload)
  })

  it('keeps the shared script while owning callbacks and triggers per consumer', async () => {
    const head = createHead()
    const cleanupA = vi.fn()
    const cleanupB = vi.fn()
    const loadedA = vi.fn()
    const loadedB = vi.fn()

    const scopeA = useScript(head, '/shared.js', {
      scope: true,
      trigger: () => cleanupA,
    })
    const scopeB = useScript(head, '/shared.js', {
      scope: true,
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
    scopeB.script.status = 'loaded'
    head.hooks.callHook('script:updated', { script: scopeB.script as unknown as ScriptInstance<object> })
    await scopeB.script._loadPromise

    expect(loadedA).not.toHaveBeenCalled()
    expect(loadedB).toHaveBeenCalledOnce()
    expect(cleanupB).toHaveBeenCalledOnce()
  })

  it('disposes all scopes when the shared script is removed', async () => {
    const head = createHead()
    const scopeA = useScript(head, '/shared.js', { scope: true, trigger: 'manual' })
    const scopeB = useScript(head, '/shared.js', { scope: true, trigger: 'manual' })
    const script = scopeA.script

    script.remove()
    await script._loadPromise
    await Promise.resolve()

    expect(scopeA.signal.aborted).toBe(true)
    expect(scopeB.signal.aborted).toBe(true)
  })

  it('emits scoped errors before releasing an aborted script scope', async () => {
    const head = createHead()
    const scope = useScript(head, '/failed.js', { scope: true, trigger: 'manual' })
    const onError = vi.fn()
    scope.onError(onError)

    scope.load()
    const errorEvent = new Event('error')
    const entry = (scope.script as any).input
    entry.onerror?.(errorEvent)
    await scope.script._loadPromise
    await Promise.resolve()

    expect(onError).toHaveBeenCalledOnce()
    expect(scope.signal.aborted).toBe(true)
  })

  it('does not replay callbacks registered after disposal', async () => {
    const head = createHead()
    const scope = useScript(head, '/loaded.js', { scope: true, trigger: 'manual' })
    const script = scope.script

    script.load()
    script.status = 'loaded'
    head.hooks.callHook('script:updated', { script: script as unknown as ScriptInstance<object> })
    await script._loadPromise
    scope.dispose()

    const loaded = vi.fn()
    const off = scope.onLoaded(loaded)

    expect(off).toBeTypeOf('function')
    expect(loaded).not.toHaveBeenCalled()
  })

  it('does not remove a shared script when one scope trigger throws', () => {
    const head = createHead()
    const scope = useScript(head, '/shared-trigger.js', { scope: true, trigger: 'manual' })
    const script = scope.script

    expect(() => useScript(head, '/shared-trigger.js', {
      scope: true,
      trigger: () => {
        throw new Error('scope trigger failed')
      },
    })).toThrow('scope trigger failed')

    expect(head._scripts?.['/shared-trigger.js']).toBe(script)
    expect(script.signal.aborted).toBe(false)
    expect(script.status).toBe('awaitingLoad')
    expect(script._triggerAbortControllers?.size).toBe(0)
  })

  it('does not remove a shared script when an unscoped cached trigger throws', () => {
    const head = createHead()
    const script = useScript(head, '/shared-unscoped-trigger.js', { trigger: 'manual' })

    expect(() => useScript(head, '/shared-unscoped-trigger.js', {
      trigger: () => {
        throw new Error('consumer trigger failed')
      },
    })).toThrow('consumer trigger failed')

    expect(head._scripts?.['/shared-unscoped-trigger.js']).toBe(script)
    expect(script.signal.aborted).toBe(false)
    expect(script.status).toBe('awaitingLoad')
  })
})
