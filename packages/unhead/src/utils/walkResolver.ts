import type { PropResolver } from '../types'
import { isUnsafeKey } from './unsafeKey'

export function walkResolver(val: any, resolve?: PropResolver, key?: string): any {
  // Combined primitive type check
  const type = typeof val

  if (type === 'function') {
    if (!key || (key !== 'titleTemplate' && !(key[0] === 'o' && key[1] === 'n'))) {
      val = val()
    }
  }

  // Apply resolver if provided, otherwise use the value as-is
  const v = resolve ? resolve(key, val) : val

  if (Array.isArray(v)) {
    let out: any[] | undefined
    for (let i = 0; i < v.length; i++) {
      const resolved = walkResolver(v[i], resolve)
      if (out) {
        out[i] = resolved
      }
      else if (resolved !== v[i]) {
        out = v.slice(0, i)
        out[i] = resolved
      }
    }
    return out || v
  }

  if (v?.constructor === Object) {
    let next: Record<string, any> | undefined
    for (const k in v) {
      const unsafe = isUnsafeKey(k)
      const resolved = unsafe ? undefined : walkResolver(v[k], resolve, k)
      if (!next && (unsafe || resolved !== v[k])) {
        next = {}
        for (const previousKey in v) {
          if (previousKey === k) {
            break
          }
          next[previousKey] = v[previousKey]
        }
      }
      if (next && !unsafe) {
        next[k] = resolved
      }
    }
    return next || v
  }

  return v
}
