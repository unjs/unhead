import type { UseScriptTrigger } from './types'

export interface ScriptTriggerTimeoutOptions {
  /** Delay in milliseconds before loading. */
  timeout: number
}

/** Load a script after a cancellable timeout. */
export function createScriptTriggerTimeout(options: ScriptTriggerTimeoutOptions): UseScriptTrigger {
  return (load) => {
    const timer = setTimeout(load, options.timeout)
    return () => clearTimeout(timer)
  }
}

export interface ScriptTriggerInteractionOptions {
  /** Events that should start loading. */
  events: string[]
  /** Event target, resolved when the trigger is installed. Defaults to the document root. */
  target?: EventTarget | (() => EventTarget | null)
}

/** Load a script on the first matching user interaction. */
export function createScriptTriggerInteraction(options: ScriptTriggerInteractionOptions): UseScriptTrigger {
  return (load) => {
    const target = typeof options.target === 'function'
      ? options.target()
      : options.target || (typeof document === 'undefined' ? null : document.documentElement)
    if (!target)
      return

    let active = true
    let onInteraction: EventListener
    const cleanup = () => {
      if (!active)
        return
      active = false
      for (const event of options.events)
        target.removeEventListener(event, onInteraction)
    }
    onInteraction = () => {
      cleanup()
      load()
    }
    for (const event of options.events)
      target.addEventListener(event, onInteraction, { passive: true })
    return cleanup
  }
}

export interface ScriptTriggerServiceWorkerOptions {
  /** Fallback delay in milliseconds. @default 3000 */
  timeout?: number
  /** Called when the fallback delay elapses before a controller is available. */
  onTimeout?: () => void
}

/** Load once a service worker controls the page, with a timeout fallback. */
export function createScriptTriggerServiceWorker(options: ScriptTriggerServiceWorkerOptions = {}): UseScriptTrigger {
  return (load) => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      load()
      return
    }

    const serviceWorker = navigator.serviceWorker
    if (serviceWorker.controller) {
      load()
      return
    }

    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let onControllerChange: EventListener
    const cleanup = () => {
      if (!active)
        return
      active = false
      serviceWorker.removeEventListener('controllerchange', onControllerChange)
      clearTimeout(timer)
    }
    const done = () => {
      cleanup()
      load()
    }
    onControllerChange = () => done()
    serviceWorker.addEventListener('controllerchange', onControllerChange)
    timer = setTimeout(() => {
      options.onTimeout?.()
      done()
    }, options.timeout ?? 3000)
    return cleanup
  }
}
