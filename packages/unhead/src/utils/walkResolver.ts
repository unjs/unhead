import type { PropResolver } from '../types'

export function walkResolver(val: any, resolve?: PropResolver, key?: string): any {
  if (key === '_resolver')
    return val
  if (typeof val === 'function' && (!key || (key !== 'titleTemplate' && !key.startsWith('on'))))
    val = val()
  const v = resolve ? resolve(key, val) : val
  if (Array.isArray(v))
    return v.map(r => walkResolver(r, resolve))
  if (v?.constructor === Object) {
    const next: Record<string, any> = {}
    for (const k in v) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype')
        continue
      next[k] = walkResolver(v[k], resolve, k)
    }
    return next
  }
  return v
}
