import type { AsVoidFunctions, RecordingEntry } from './types'

export function createNoopedRecordingProxy<T extends Record<string, any>>(instance: T = {} as T): { proxy: AsVoidFunctions<T>, stack: RecordingEntry[][] } {
  const stack: RecordingEntry[][] = []
  let stackIdx = -1
  const handler = (reuse = false): ProxyHandler<T> => ({
    get(_, prop, receiver) {
      if (!reuse) {
        const v = Reflect.get(_, prop, receiver)
        if (typeof v !== 'undefined')
          return v
        stack[++stackIdx] = []
      }
      stack[stackIdx].push({ type: 'get', key: prop })
      // @ts-expect-error untyped
      return new Proxy(() => {}, handler(true))
    },
    apply(_, __, args) {
      stack[stackIdx].push({ type: 'apply', key: '', args })
      return undefined
    },
  })
  return { proxy: new Proxy(instance || {}, handler()), stack }
}

export function createForwardingProxy<T extends Record<string, any>>(target: T): AsVoidFunctions<T> {
  const handler: ProxyHandler<T> = {
    get(_, prop, receiver) {
      const v = Reflect.get(_, prop, receiver)
      return typeof v === 'object' ? new Proxy(v, handler) : v
    },
    apply(_, __, args) {
      // @ts-expect-error untyped
      Reflect.apply(_, __, args)
      return undefined
    },
  }
  return new Proxy(target, handler) as AsVoidFunctions<T>
}

export function replayProxyRecordings<T extends object>(target: T, stack: RecordingEntry[][]) {
  for (const recordings of stack) {
    let ctx: any = target
    let prev: any = target
    for (const { type, key, args } of recordings) {
      if (type === 'get') {
        prev = ctx
        ctx = ctx[key]
      }
      else if (type === 'apply') {
        // @ts-expect-error untyped
        ctx = (ctx as () => any).call(prev, ...args)
      }
    }
  }
}
