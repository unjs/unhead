import type { PropResolver } from '../types'

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
    return v.map(r => walkResolver(r, resolve))
  }

  if (v?.constructor === Object) {
    const next: Record<string, any> = {}
    for (const k of Object.keys(v)) {
      next[k] = walkResolver(v[k], resolve, k)
    }
    return next
  }

  return v
}
