import type {
  ScriptInstance,
  ScriptScope,
  ScriptScopeCleanup,
  ScriptScopeEffect,
  ScriptScopeEffectOptions,
  UseScriptOptions,
} from './types'

type BaseScriptApi = Record<symbol | string, any>
type Disposer = () => void

/** Report cleanup failures without interrupting framework teardown. */
function reportScopeError(error: unknown) {
  const reportError = (globalThis as typeof globalThis & { reportError?: (error: unknown) => void }).reportError
  if (reportError) {
    reportError(error)
  }
  else {
    queueMicrotask(() => {
      throw error
    })
  }
}

/** Create an independently disposable consumer view of a shared script. */
export function createScriptScope<T extends BaseScriptApi>(script: ScriptInstance<T>): ScriptScope<T> {
  const controller = new AbortController()
  const disposers = new Set<Disposer>()
  let disposed = false

  const track = (dispose: Disposer): Disposer => {
    let active = true
    const trackedDispose = () => {
      if (!active)
        return
      active = false
      disposers.delete(trackedDispose)
      dispose()
    }
    if (disposed)
      trackedDispose()
    else
      disposers.add(trackedDispose)
    return trackedDispose
  }

  const dispose = () => {
    if (disposed)
      return
    disposed = true
    controller.abort()
    const errors: unknown[] = []
    for (const off of [...disposers].reverse()) {
      try {
        off()
      }
      catch (error) {
        errors.push(error)
      }
    }
    if (errors.length === 1)
      reportScopeError(errors[0])
    if (errors.length > 1)
      reportScopeError(new AggregateError(errors, 'Failed to dispose script scope'))
  }

  const onScriptAbort = () => {
    controller.abort(script.signal.reason)
    // Script errors abort the shared signal before queued onError callbacks are
    // emitted. Give those callbacks one turn before releasing registrations.
    queueMicrotask(() => queueMicrotask(dispose))
  }
  if (script.signal.aborted) {
    onScriptAbort()
  }
  else {
    script.signal.addEventListener('abort', onScriptAbort, { once: true })
    track(() => script.signal.removeEventListener('abort', onScriptAbort))
  }

  const scope = Object.create(script) as ScriptScope<T>
  Object.defineProperties(scope, {
    script: { value: script, enumerable: true },
    signal: { value: controller.signal, enumerable: true },
    disposed: { get: () => disposed, enumerable: true },
    dispose: { value: dispose, enumerable: true },
    setupTriggerHandler: {
      value: (trigger: UseScriptOptions['trigger']) => {
        if (disposed)
          return () => {}
        try {
          return track(script._setupTriggerHandler(trigger, false))
        }
        catch (error) {
          dispose()
          throw error
        }
      },
      enumerable: true,
      configurable: true,
      writable: true,
    },
    onLoaded: {
      value: (fn: (instance: T) => void | Promise<void>, options?: ScriptScopeEffectOptions) => {
        if (disposed)
          return () => {}
        return track(script.onLoaded(fn, options))
      },
      enumerable: true,
      configurable: true,
      writable: true,
    },
    onError: {
      value: (fn: (err?: Error) => void | Promise<void>, options?: ScriptScopeEffectOptions) => {
        if (disposed)
          return () => {}
        return track(script.onError(fn, options))
      },
      enumerable: true,
      configurable: true,
      writable: true,
    },
    onLoadedEffect: {
      value: (fn: ScriptScopeEffect<T>, options?: ScriptScopeEffectOptions) => {
        if (disposed || controller.signal.aborted)
          return () => {}
        const effectController = new AbortController()
        let cleanup: ScriptScopeCleanup | undefined
        let effectDisposed = false
        const abortEffect = () => effectController.abort(controller.signal.reason)
        controller.signal.addEventListener('abort', abortEffect, { once: true })

        const handleError = (error: unknown) => {
          if (options?.onError) {
            options.onError(error)
          }
          else {
            reportScopeError(error)
          }
        }
        const runCleanup = () => {
          const currentCleanup = cleanup
          cleanup = undefined
          if (!currentCleanup)
            return
          try {
            Promise.resolve(currentCleanup()).catch(handleError)
          }
          catch (error) {
            handleError(error)
          }
        }
        const off = scope.onLoaded(async (instance) => {
          try {
            const result = await fn(instance, { signal: effectController.signal })
            if (typeof result === 'function') {
              if (effectDisposed) {
                try {
                  await result()
                }
                catch (error) {
                  handleError(error)
                }
              }
              else {
                cleanup = result
              }
            }
          }
          catch (error) {
            if (!effectController.signal.aborted)
              handleError(error)
          }
        }, options)
        return track(() => {
          if (effectDisposed)
            return
          effectDisposed = true
          controller.signal.removeEventListener('abort', abortEffect)
          effectController.abort(controller.signal.reason)
          off()
          runCleanup()
        })
      },
      enumerable: true,
      configurable: true,
      writable: true,
    },
  })
  return scope
}
