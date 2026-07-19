import type {
  ScriptInstance,
  ScriptScope,
  UseScriptOptions,
} from './types'

type BaseScriptApi = Record<symbol | string, any>
type Disposer = () => void

/** Create an independently disposable consumer view of a shared script. */
export function createScriptScope<T extends BaseScriptApi>(script: ScriptInstance<T>): ScriptScope<T> {
  const controller = new AbortController()
  const disposers = new Set<Disposer>()
  let disposed = false

  const track = (dispose: Disposer): Disposer => {
    const trackedDispose = () => {
      if (disposers.delete(trackedDispose))
        dispose()
    }
    if (disposed)
      dispose()
    else
      disposers.add(trackedDispose)
    return trackedDispose
  }

  const dispose = () => {
    if (disposed)
      return
    disposed = true
    controller.abort()
    let firstError: unknown
    for (const off of [...disposers].reverse()) {
      try {
        off()
      }
      catch (error) {
        firstError ||= error
      }
    }
    if (firstError)
      queueMicrotask(() => { throw firstError })
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

  return Object.assign(Object.create(script), {
    script,
    signal: controller.signal,
    dispose,
    setupTriggerHandler(trigger: UseScriptOptions['trigger']) {
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
    onLoaded(fn: (instance: T) => void | Promise<void>, options?: Parameters<typeof script.onLoaded>[1]) {
      return disposed ? () => {} : track(script.onLoaded(fn, options))
    },
    onError(fn: (err?: Error) => void | Promise<void>, options?: Parameters<typeof script.onError>[1]) {
      return disposed ? () => {} : track(script.onError(fn, options))
    },
  }) as ScriptScope<T>
}
