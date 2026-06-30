import type { PropResolver } from '../types'
import { isUnsafeKey } from './unsafeKey'

export function walkResolver(val: any, resolve?: PropResolver, key?: string): any {
  if (key === '_resolver')
    return val
  if (typeof val === 'function' && (!key || (key !== 'titleTemplate' && !key.startsWith('on'))))
    val = val()
  const v = resolve ? resolve(key, val) : val
  // Structural sharing: only allocate a new array/object when a child actually
  // changed (a function was unwrapped or a resolver rewrote a value). For static
  // input with no resolver — the common SSR case — every walk returns the same
  // reference, so the whole tree is shared instead of deep-cloned. Downstream
  // (normalizeProps) copies into fresh objects, so sharing here is safe.
  if (Array.isArray(v)) {
    let out: any[] | undefined
    for (let i = 0; i < v.length; i++) {
      const r = walkResolver(v[i], resolve)
      if (out) {
        out[i] = r
      }
      else if (r !== v[i]) {
        // first changed element: lazily clone the prefix we already passed
        out = v.slice(0, i)
        out[i] = r
      }
    }
    return out || v
  }
  if (v?.constructor === Object) {
    let next: Record<string, any> | undefined
    for (const k in v) {
      // never read/assign dangerous keys; the `continue` keeps us from ever doing
      // `next['__proto__'] = …` (which would set a prototype). Object spread below is
      // [[CreateDataProperty]], so it cannot pollute, and normalizeProps strips any
      // dangerous key it carries through.
      if (isUnsafeKey(k))
        continue
      const r = walkResolver(v[k], resolve, k)
      // first changed child: shallow-clone once, then keep overwriting in place
      if (r !== v[k])
        (next ??= { ...v })[k] = r
    }
    return next || v
  }
  return v
}
