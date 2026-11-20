function isFunctionValue(key?: string): boolean {
  return key === 'titleTemplate' || !!key?.startsWith('on')
}

// Deep equality of head input against a copy from `copyInput`: plain objects, lists, and primitives.
// The copy holds no plain object of the input, so the same object on both sides is one the copy
// shares, such as a promise. It may have changed in place, so it counts as a change. A getter can
// return another value on each call, so it counts as a change too.
// A `titleTemplate`, an event handler, or a schema.org node resolver is a value.
export function sameInput(a: any, b: any, key?: string): boolean {
  if (a === b)
    return typeof a === 'function' ? isFunctionValue(key) : !a || typeof a !== 'object' || key === '_resolver'
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || a.constructor !== b.constructor || (a.constructor !== Object && !Array.isArray(a)))
    return false
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every(k => sameInput(a[k], b[k], k))
}

// Keep the original values when the app edits a plain object or list in place.
export function copyInput<T>(value: T, captureGetters = false, key?: string): T {
  // the resolver leaves a schema.org node resolver as it is
  if (key === '_resolver')
    return value
  if (captureGetters && typeof value === 'function' && !isFunctionValue(key)) {
    try {
      // Adoption needs the original value, while comparison still treats getters as unknown.
      const resolved = value()
      const snapshot = typeof resolved === 'function' ? resolved : copyInput(resolved, true)
      return (() => snapshot) as T
    }
    catch {
      // Let the renderer handle the error if a getter is still unavailable then.
      return value
    }
  }
  if (!value || typeof value !== 'object' || (!Array.isArray(value) && (value as any).constructor !== Object))
    return value
  const out: any = Array.isArray(value) ? [] : {}
  for (const k in value)
    out[k] = copyInput((value as any)[k], captureGetters, k)
  return out
}
