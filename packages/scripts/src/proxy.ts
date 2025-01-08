import type { AsVoidFunctions } from './types'

type RecordingEntry =
  | { type: 'get', key: string | symbol, args?: any[] }
  | { type: 'apply', key: string | symbol, args: any[] }

export function createSpyProxy<T extends Record<string, any>>(instance: T = {} as T, onApply: any): T {
  const stack: RecordingEntry[][] = []

  let stackIdx = -1
  const handler = (reuseStack = false) => ({
    get(_, prop, receiver) {
      if (!reuseStack) {
        stackIdx++ // root get triggers a new stack
        stack[stackIdx] = []
      }
      stack[stackIdx].push({ type: 'get', key: prop })
      const v = Reflect.get(_, prop, receiver)
      if (v) {
        return new Proxy(v, handler(true))
      }
    },
    apply(_, __, args) {
      stack[stackIdx].push({ type: 'apply', key: '', args })
      onApply(stack, args)
      // @ts-expect-error untyped
      return Reflect.apply(_, __, args)
    },
  } as ProxyHandler<T>)

  return new Proxy(instance, handler())
}

export function createNoopedRecordingProxy<T extends Record<string, any>>(instance: T = {} as T): { proxy: AsVoidFunctions<T>, stack: RecordingEntry[][] } {
  const stack: RecordingEntry[][] = []

  let stackIdx = -1
  const handler = (reuseStack = false) => ({
    get(_, prop, receiver) {
      if (!reuseStack) {
        const v = Reflect.get(_, prop, receiver)
        if (typeof v !== 'undefined') {
          return v
        }
        stackIdx++ // root get triggers a new stack
        stack[stackIdx] = []
      }
      stack[stackIdx].push({ type: 'get', key: prop })
      // @ts-expect-error untyped
      return new Proxy(() => {}, handler(true))
    },
    apply(_, __, args) {
      stack[stackIdx].push({ type: 'apply', key: '', args })
      return undefined
    },
  } as ProxyHandler<T>)

  return {
    proxy: new Proxy(instance || {}, handler()),
    stack,
  }
}

export function replayProxyRecordings<T extends object>(target: T, stack: RecordingEntry[][]) {
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
