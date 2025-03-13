import type { PropResolver } from '../types'

export function walkResolver(val: any, resolve?: PropResolver, key?: string): any {
  // Combined primitive type check
  const type = typeof val

  if (type === 'function') {
    if (!key || (key !== 'titleTemplate' && !(key[0] === 'o' && key[1] === 'n'))) {
      val = val()
    }
  }
  let v: any
  if (resolve) {
    v = resolve(key, val)
  }

  if (Array.isArray(v)) {
    return v.map(r => walkResolver(r, resolve))
  }

  if (v?.constructor === Object) {
    const next: Record<string, any> = {}
    for (const key of Object.keys(v)) {
      next[key] = walkResolver(v[key], resolve, key)
    }
    return next
  }

  return v
}
