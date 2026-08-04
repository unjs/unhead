import type { AsVoidFunctions, RecordingEntry } from './types'

function NOOP() {}

interface ScriptProxy<T extends Record<symbol | string, any>> {
  proxy: AsVoidFunctions<T>
  stack: RecordingEntry[][]
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
        context = Reflect.apply(context as () => any, prevContext, args)
      }
    })
  })
}

function walk(root: any, path: PropertyKey[]) {
  let owner: any
  let value = root
  for (const key of path) {
    if (value == null)
      return { owner: undefined, value: undefined }
    owner = value
    value = value[key]
  }
  return { owner, value }
}

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
          const result = value == null ? undefined : Reflect.get(value, prop, value)
          if (typeof result !== 'function')
            return result
        }
        else if (!path.length) {
          const result = Reflect.get(initial, prop)
          if (typeof result !== 'undefined')
            return result
          stackIdx++
          stack[stackIdx] = [{ type: 'get', key: prop }]
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
          if (typeof value === 'function')
            Reflect.apply(value, owner, args)
        }
        else {
          stack[stackIdx].push({ type: 'apply', key: '', args })
        }
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
