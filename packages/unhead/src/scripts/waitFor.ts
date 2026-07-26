import type { UseScriptWaitFor, UseScriptWaitForSetup } from './types'

export function createScriptWaitFor(signal: AbortSignal): UseScriptWaitFor {
  return (<T>(setup: UseScriptWaitForSetup<T>): Promise<T> => new Promise<T>((outerResolve, outerReject) => {
    let settled = false
    let resolving = false
    let resolution: unknown
    let cleanup: (() => void) | undefined
    let onAbort: () => void

    const finish = (settle: (value: any) => void, value?: unknown) => {
      if (settled)
        return
      settled = true
      signal.removeEventListener('abort', onAbort)
      const currentCleanup = cleanup
      cleanup = undefined
      try {
        currentCleanup?.()
      }
      catch (error) {
        outerReject(error)
        return
      }
      settle(value)
    }
    const reject = (reason?: unknown) => queueMicrotask(() => finish(outerReject, reason))
    const resolve = (value: T | PromiseLike<T>) => {
      resolution = value
      if (!settled && !resolving) {
        resolving = true
        Promise.resolve(value).then(
          resolved => finish(outerResolve, resolved),
          reject,
        )
      }
      return value
    }
    onAbort = () => {
      const error = new Error('Script lifecycle aborted')
      error.name = 'AbortError'
      reject(typeof signal.reason === 'undefined' ? error : signal.reason)
    }

    if (signal.aborted) {
      onAbort()
      return
    }

    signal.addEventListener('abort', onAbort, { once: true })
    try {
      const result = setup(resolve, reject)
      cleanup = result !== resolution && typeof result === 'function' ? result : undefined
    }
    catch (error) {
      reject(error)
    }
  })) as UseScriptWaitFor
}
