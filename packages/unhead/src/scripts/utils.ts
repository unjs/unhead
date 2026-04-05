import type { RecordingEntry } from './types'

export function createSpyProxy<T extends Record<string, any> | any[]>(target: T, onApply: (stack: RecordingEntry[][]) => void): T {
  const stack: RecordingEntry[][] = []
  let stackIdx = -1
  const handler = (reuse = false): ProxyHandler<T> => ({
    get(_, prop, receiver) {
      if (!reuse) { stack[++stackIdx] = [] }
      const v = Reflect.get(_, prop, receiver)
      if (typeof v === 'object' || typeof v === 'function') {
        stack[stackIdx].push({ type: 'get', key: prop })
        // @ts-expect-error untyped
        return new Proxy(v, handler(true))
      }
      stack[stackIdx].push({ type: 'get', key: prop, value: v })
      return v
    },
    // @ts-expect-error untyped
    apply(_, __, args) { stack[stackIdx].push({ type: 'apply', key: '', args }); onApply(stack); return Reflect.apply(_, __, args) },
  })
  return new Proxy(target, handler())
}
