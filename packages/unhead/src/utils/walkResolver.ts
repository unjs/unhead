import type { PropResolver } from '../types'
import { isUnsafeKey } from './unsafeKey'

/**
 * A repeated ancestor is a cycle in the user's input. The walk recurses
 * forever without this check, so the caller sees `Maximum call stack size
 * exceeded` ten frames deep in unhead internals instead of the input's
 * fault. Siblings may share a reference, so each object leaves the set when
 * its subtree completes.
 */
function assertNotCycle(v: object, seen: Set<object> | undefined, key?: string): Set<object> {
  if (seen?.has(v)) {
    throw new Error(`[unhead] Circular reference detected in head input${key ? ` at key "${key}"` : ''}. Remove the cycle, head tags must be a serialisable tree.`)
  }
  const next = seen ?? new Set()
  next.add(v)
  return next
}

export function walkResolver(val: any, resolve?: PropResolver, key?: string, seen?: Set<object>): any {
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
    const walking = assertNotCycle(v, seen)
    let out: any[] | undefined
    for (let i = 0; i < v.length; i++) {
      const r = walkResolver(v[i], resolve, undefined, walking)
      if (out) {
        out[i] = r
      }
      else if (r !== v[i]) {
        // first changed element: lazily clone the prefix we already passed
        out = v.slice(0, i)
        out[i] = r
      }
    }
    walking.delete(v)
    return out || v
  }
  if (v?.constructor === Object) {
    const walking = assertNotCycle(v, seen, key)
    let next: Record<string, any> | undefined
    for (const k in v) {
      const unsafe = isUnsafeKey(k)
      const r = unsafe ? undefined : walkResolver(v[k], resolve, k, walking)
      // Diverge from `v` on the first unsafe key (which must be dropped) or changed
      // child: clone the safe keys already visited. This keeps the walked result free
      // of __proto__/constructor/prototype (matching the old deep-clone) while still
      // sharing `v` untouched when every key is safe and unchanged — the common case.
      if (!next && (unsafe || r !== v[k])) {
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
    walking.delete(v)
    return next || v
  }
  return v
}
