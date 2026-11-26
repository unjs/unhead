import type { PropResolver } from '../types'
import { isUnsafeKey } from './unsafeKey'

const isPrim = (v: unknown) => !v || (typeof v !== 'object' && typeof v !== 'function')

export function walkResolver(val: any, resolve?: PropResolver, key?: string, skipPrim = !resolve || !!resolve._static): any {
  if (key === '_resolver')
    return val
  if (typeof val === 'function' && key !== 'titleTemplate' && !key?.startsWith('on'))
    val = val()
  const v = resolve ? resolve(key, val) : val
  if (!v || typeof v !== 'object')
    return v
  // Structural sharing: only allocate a new array/object when a child actually
  // changed (a function was unwrapped or a resolver rewrote a value). For static
  // input with no resolver — the common SSR case — every walk returns the same
  // reference, so the whole tree is shared instead of deep-cloned. Downstream
  // (normalizeProps) copies into fresh objects, so sharing here is safe.
  if (Array.isArray(v)) {
    let out: any[] | undefined
    for (let i = 0; i < v.length; i++) {
      const item = v[i]
      const r = skipPrim && isPrim(item) ? item : walkResolver(item, resolve, undefined, skipPrim)
      // first changed element: lazily clone the prefix we already passed
      if (!out && r !== item)
        out = v.slice(0, i)
      if (out)
        out[i] = r
    }
    return out || v
  }
  if (v.constructor === Object) {
    let next: Record<string, any> | undefined
    for (const k in v) {
      const unsafe = isUnsafeKey(k)
      const child = unsafe ? undefined : v[k]
      const r = unsafe ? undefined : skipPrim && isPrim(child) ? child : walkResolver(child, resolve, k, skipPrim)
      // Diverge from `v` on the first unsafe key (which must be dropped) or changed
      // child: clone the safe keys already visited. This keeps the walked result free
      // of __proto__/constructor/prototype (matching the old deep-clone) while still
      // sharing `v` untouched when every key is safe and unchanged — the common case.
      if (!next && (unsafe || r !== child)) {
        next = {}
        for (const pk in v) {
          if (pk === k)
            break
          next[pk] = v[pk] // every prior key was safe; we'd have diverged at the first unsafe one
        }
      }
      // never assign an unsafe key (`next['__proto__'] = …` would set a prototype)
      if (next && !unsafe)
        next[k] = r
    }
    return next || v
  }
  return v
}
