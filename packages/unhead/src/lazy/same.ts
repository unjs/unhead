// Deep equality of head input against a copy from `copyInput`: plain objects, lists, and primitives.
// The copy holds no plain object of the input, so the same object on both sides is one the copy
// shares, such as a promise. It may have changed in place, so it counts as a change. A getter may
// return a new value, so it counts as a change too. A `titleTemplate` or an event handler is a value.
export function sameInput(a: any, b: any, key?: string): boolean {
  if (a === b)
    return typeof a === 'function' ? key === 'titleTemplate' || !!key?.startsWith('on') : !a || typeof a !== 'object'
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || a.constructor !== b.constructor || (a.constructor !== Object && !Array.isArray(a)))
    return false
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every(k => sameInput(a[k], b[k], k))
}

// A copy of every plain object and list in head input, so an input that the app edits in place,
// as a reactive object, keeps the values it had. Any other object stays shared.
export function copyInput<T>(value: T): T {
  if (!value || typeof value !== 'object' || (!Array.isArray(value) && (value as any).constructor !== Object))
    return value
  const out: any = Array.isArray(value) ? [] : {}
  for (const key in value)
    out[key] = copyInput((value as any)[key])
  return out
}
