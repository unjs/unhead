import type { AsVoidFunctions, RecordingEntry } from './types'

export function createNoopedRecordingProxy<T extends Record<string, any>>(instance?: T): { proxy: AsVoidFunctions<T>, stack: RecordingEntry[][], resolve: (target: T) => void } {
  const stack: RecordingEntry[][] = []
  const backing = {} as T
  let resolved = instance
  const forward = (value: any, owner: any) => value && (typeof value === 'object' || typeof value === 'function')
    ? createForwardingProxy(value, owner)
    : value

  let stackIdx = -1
  const handler = (reuseStack = false) => ({
    get(_, prop, receiver) {
      if (!reuseStack && resolved) {
        const value = Reflect.get(resolved, prop, resolved)
        return forward(value, resolved)
      }
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
    set(_, prop, value) {
      const target = resolved || _
      return Reflect.set(target, prop, value, target)
    },
    has(_, prop) {
      return Reflect.has(resolved || _, prop)
    },
    ownKeys(_) {
      return Reflect.ownKeys(resolved || _)
    },
    getOwnPropertyDescriptor(_, prop) {
      if (!resolved || resolved === _)
        return Reflect.getOwnPropertyDescriptor(_, prop)
      const own = Reflect.getOwnPropertyDescriptor(_, prop)
      if (own && !own.configurable)
        return own
      const descriptor = Reflect.getOwnPropertyDescriptor(resolved, prop)
      return descriptor && { ...descriptor, configurable: true }
    },
    defineProperty(_, prop, descriptor) {
      if (!resolved || resolved === _)
        return Reflect.defineProperty(_, prop, descriptor)
      return Reflect.defineProperty(resolved, prop, descriptor) && Reflect.defineProperty(_, prop, descriptor)
    },
    deleteProperty(_, prop) {
      if (!resolved || resolved === _)
        return Reflect.deleteProperty(_, prop)
      return Reflect.deleteProperty(resolved, prop) && Reflect.deleteProperty(_, prop)
    },
    getPrototypeOf(_) {
      return resolved && Object.isExtensible(_) ? Reflect.getPrototypeOf(resolved) : Reflect.getPrototypeOf(_)
    },
  } as ProxyHandler<T>)

  return {
    // Keep the physical target empty and extensible. SDK stubs are often frozen
    // or contain non-configurable properties, which cannot safely be swapped as
    // a Proxy target once the real API resolves.
    proxy: new Proxy(backing, handler()),
    stack,
    resolve: target => resolved = target,
  }
}

export function createForwardingProxy<T extends Record<string, any>>(target: T, thisArg: any = target): AsVoidFunctions<T> {
  const handler: ProxyHandler<any> = {
    get(_, prop) {
      const value = Reflect.get(_, prop, _)
      return value && (typeof value === 'object' || typeof value === 'function')
        ? createForwardingProxy(value, _)
        : value
    },
    apply(_, __, args) {
      // does not return the apply output for consistency
      Reflect.apply(_, thisArg, args)
      return undefined
    },
  }
  return new Proxy(target, handler) as AsVoidFunctions<T>
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
