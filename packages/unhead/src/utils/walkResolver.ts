import type { PropResolver } from '../types'

export function walkResolver(val: any, resolve?: PropResolver, key?: string, track?: { pure: boolean }): any {
  if (key === '_resolver')
    return val
  if (typeof val === 'function' && (!key || (key !== 'titleTemplate' && !key.startsWith('on')))) {
    if (track)
      track.pure = false
    val = val()
  }
  const v = resolve ? resolve(key, val) : val
  if (track && v !== val)
    track.pure = false
  if (Array.isArray(v))
    return v.map(r => walkResolver(r, resolve, undefined, track))
  if (v?.constructor === Object) {
    const next: Record<string, any> = {}
    for (const k in v) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype')
        continue
      next[k] = walkResolver(v[k], resolve, k, track)
    }
    return next
  }
  return v
}
