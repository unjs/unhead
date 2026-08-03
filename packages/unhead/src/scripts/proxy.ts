import type { AsVoidFunctions, RecordingEntry } from './types'

function NOOP() {}

export interface ScriptProxy<T extends Record<symbol | string, any>> {
  proxy: AsVoidFunctions<T>
  stack: RecordingEntry[][]
  /**
   * Replay everything recorded before the script loaded, then switch the proxy to forwarding.
   */
  resolve: (instance: T) => void
}

function replayRecordings<T extends object>(target: T, stack: RecordingEntry[][]) {
  stack.forEach((recordings) => {
    let context: any = target
    let prevContext: any = target
    recordings.forEach(({ type, key, args }) => {
      if (type === 'get') {
        prevContext = context
        context = context[key]
      }
      else if (type === 'apply') {
        // @ts-expect-error untyped
        context = (context as () => any).call(prevContext, ...args)
      }
    })
  })
}

function walk(root: any, path: PropertyKey[]) {
  let owner: any
  let value = root
  for (const key of path) {
    if (value == null) {
      return { owner: undefined, value: undefined }
    }
    owner = value
    value = value[key]
  }
  return { owner, value }
}

/**
 * A single, stable proxy for a vendor API that may not exist yet.
 *
 * Before `resolve()` it records property access and calls so they can be replayed. After `resolve()`
 * the same proxy forwards to the real API, applying methods against their raw owner so native
 * receiver (brand) checks keep working.
 *
 * The proxy identity never changes, so a reference taken before the script loads keeps working after.
 */
export function createScriptProxy<T extends Record<string, any>>(initial: T = {} as T): ScriptProxy<T> {
  const stack: RecordingEntry[][] = []
  let instance: T | undefined
  let stackIdx = -1

  function node(path: PropertyKey[]): any {
    const children = new Map<PropertyKey, any>()
    return new Proxy(NOOP, {
      get(_, prop) {
        if (instance) {
          const { value } = walk(instance, path)
          const v = value == null ? undefined : Reflect.get(value, prop, value)
          // only functions need wrapping, to bind `this` and keep the void return contract
          if (typeof v !== 'function') {
            return v
          }
        }
        else if (!path.length) {
          // root access to an API that already exists on the page (e.g. a spied `window._paq`)
          const v = Reflect.get(initial, prop)
          if (typeof v !== 'undefined') {
            return v
          }
          stackIdx++ // root get triggers a new stack
          stack[stackIdx] = []
          stack[stackIdx].push({ type: 'get', key: prop })
        }
        else {
          stack[stackIdx].push({ type: 'get', key: prop })
        }
        let child = children.get(prop)
        if (!child) {
          child = node([...path, prop])
          children.set(prop, child)
        }
        return child
      },
      apply(_, __, args) {
        if (instance) {
          const { owner, value } = walk(instance, path)
          if (typeof value === 'function') {
            Reflect.apply(value, owner, args)
          }
        }
        else {
          stack[stackIdx].push({ type: 'apply', key: '', args })
        }
        // never returns the call output, a recorded call has nothing to return
        return undefined
      },
    })
  }

  return {
    proxy: node([]) as AsVoidFunctions<T>,
    stack,
    resolve(api: T) {
      instance = api
      replayRecordings(api, stack)
      stack.length = 0
    },
  }
}
