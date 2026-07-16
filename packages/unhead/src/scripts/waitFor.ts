import type { UseScriptWaitForSetup } from './types'

export function createScriptWaitFor(signal: AbortSignal) {
  return <T>(setup: UseScriptWaitForSetup<T>): Promise<T> => new Promise<T>((outerResolve, outerReject) => {
    let settled = false
    let resolving = false
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
      if (settled || resolving)
        return
      resolving = true
      Promise.resolve(value).then(
        resolved => finish(outerResolve, resolved),
        reject,
      )
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
      cleanup = setup(resolve, reject) || undefined
    }
    catch (error) {
      reject(error)
    }
  })
}
