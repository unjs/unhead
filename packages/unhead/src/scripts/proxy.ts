import type { AsVoidFunctions, RecordingEntry } from './types'

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

export function createForwardingProxy<T extends Record<string, any>>(target: T): AsVoidFunctions<T> {
  type Method = (...args: any[]) => any

  const proxyCache = new WeakMap<object, object>()
  const methodCache = new WeakMap<object, WeakMap<Method, Method>>()

  function createMethodProxy(owner: object, method: Method): Method {
    let ownerMethods = methodCache.get(owner)
    if (!ownerMethods) {
      ownerMethods = new WeakMap()
      methodCache.set(owner, ownerMethods)
    }
    const cached = ownerMethods.get(method)
    if (cached) {
      return cached
    }
    const proxy = new Proxy(method, {
      apply(_, __, args) {
        Reflect.apply(_, owner, args)
        return undefined
      },
    })
    ownerMethods.set(method, proxy)
    return proxy
  }

  function createProxy<V extends object>(value: V): V {
    const cached = proxyCache.get(value)
    if (cached) {
      return cached as V
    }
    const proxy = new Proxy(value, {
      get(_, prop) {
        const v = Reflect.get(_, prop, _)
        if (typeof v === 'function') {
          return createMethodProxy(_, v as Method)
        }
        if (v !== null && typeof v === 'object') {
          return createProxy(v)
        }
        return v
      },
      set(_, prop, value) {
        return Reflect.set(_, prop, value, _)
      },
      apply(_, __, args) {
        // does not return the apply output for consistency
        // @ts-expect-error untyped
        Reflect.apply(_, __, args)
        return undefined
      },
    })
    proxyCache.set(value, proxy)
    return proxy
  }

  return createProxy(target) as AsVoidFunctions<T>
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
