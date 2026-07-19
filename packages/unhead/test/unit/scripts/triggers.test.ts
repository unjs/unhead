import { afterEach, describe, expect, it, vi } from 'vitest'
// @vitest-environment jsdom
import { createHead } from '../../../src/client'
import { useScript } from '../../../src/scripts'
import {
  createScriptTriggerInteraction,
  createScriptTriggerServiceWorker,
  createScriptTriggerTimeout,
} from '../../../src/scripts/triggers'
import { createHead as createServerHead } from '../../../src/server'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('script triggers', () => {
  it('cancels a pending timeout when its scope is disposed', () => {
    vi.useFakeTimers()
    const scope = useScript(createHead(), '/timeout.js', {
      scope: true,
      trigger: createScriptTriggerTimeout({ timeout: 100 }),
    })

    scope.dispose()
    vi.advanceTimersByTime(100)

    expect(scope.script.status).toBe('awaitingLoad')
  })

  it('loads on the first interaction and removes every listener', () => {
    const target = new EventTarget()
    const add = vi.spyOn(target, 'addEventListener')
    const remove = vi.spyOn(target, 'removeEventListener')
    const load = vi.fn()
    const trigger = createScriptTriggerInteraction({
      events: ['pointerdown', 'keydown'],
      target: () => target,
    })

    const cleanup = trigger(load)
    target.dispatchEvent(new Event('keydown'))
    target.dispatchEvent(new Event('pointerdown'))

    expect(add).toHaveBeenCalledTimes(2)
    expect(remove).toHaveBeenCalledTimes(2)
    expect(load).toHaveBeenCalledOnce()
    cleanup?.()
    expect(remove).toHaveBeenCalledTimes(2)
  })

  it('loads immediately when service workers are unavailable', () => {
    vi.stubGlobal('navigator', {})
    const load = vi.fn()

    createScriptTriggerServiceWorker()(load)

    expect(load).toHaveBeenCalledOnce()
  })

  it('loads immediately when a service worker already controls the page', () => {
    vi.stubGlobal('navigator', {
      serviceWorker: Object.assign(new EventTarget(), { controller: {} }),
    })
    const load = vi.fn()

    createScriptTriggerServiceWorker()(load)

    expect(load).toHaveBeenCalledOnce()
  })

  it('loads when a service worker takes control and clears its fallback', () => {
    vi.useFakeTimers()
    const serviceWorker = Object.assign(new EventTarget(), { controller: null })
    vi.stubGlobal('navigator', { serviceWorker })
    const load = vi.fn()
    const onTimeout = vi.fn()

    createScriptTriggerServiceWorker({ timeout: 100, onTimeout })(load)
    serviceWorker.dispatchEvent(new Event('controllerchange'))
    vi.advanceTimersByTime(100)

    expect(load).toHaveBeenCalledOnce()
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('uses the service worker timeout fallback and supports disposal', () => {
    vi.useFakeTimers()
    const serviceWorker = Object.assign(new EventTarget(), { controller: null })
    vi.stubGlobal('navigator', { serviceWorker })
    const load = vi.fn()
    const onTimeout = vi.fn()
    const trigger = createScriptTriggerServiceWorker({ timeout: 100, onTimeout })

    const cleanup = trigger(load)
    cleanup?.()
    vi.advanceTimersByTime(100)
    expect(load).not.toHaveBeenCalled()

    trigger(load)
    vi.advanceTimersByTime(100)
    expect(onTimeout).toHaveBeenCalledOnce()
    expect(load).toHaveBeenCalledOnce()
  })

  it('does not resolve interaction targets during SSR', () => {
    const target = vi.fn(() => new EventTarget())

    useScript(createServerHead(), '/ssr.js', {
      trigger: createScriptTriggerInteraction({ events: ['click'], target }),
    })

    expect(target).not.toHaveBeenCalled()
  })
})
