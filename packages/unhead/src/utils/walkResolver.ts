import type { PropResolver } from 'unhead/types'

export function walkResolver(val: any, resolve?: PropResolver, key?: string): any {
  // Combined primitive type check
  const type = typeof val

  let v: any
  if (!resolve || !key) {
    v = type === 'function' ? val() : val
  }
  else if (resolve && (key === 'titleTemplate' || (key[0] === 'o' && key[1] === 'n'))) {
    v = resolve(key, val)
  }
  else if (resolve) {
    v = type === 'function' ? resolve(key, val()) : resolve(key, val)
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
