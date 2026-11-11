// Deep equality of head input against a copy from `copyInput`: plain objects, lists, and primitives.
// The copy holds no plain object of the input, so the same object on both sides is one the copy
// shares, such as a promise. It may have changed in place, so it counts as a change. The copy holds
// the value of a getter, so a getter in the input counts as a change too.
// A `titleTemplate` or an event handler is a value.
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
// A getter resolves now, with the rules of the resolver. A getter can return another value later,
// so the copy keeps the value, and a hydrated copy keeps the tag that the server rendered.
export function copyInput<T>(value: T, key?: string): T {
  // the resolver leaves a schema.org node resolver as it is
  if (key === '_resolver')
    return value
  if (typeof value === 'function' && key !== 'titleTemplate' && !key?.startsWith('on')) {
    try {
      value = value()
    }
    catch {
      // A getter that throws stays in the copy and counts as a change. The render calls it again
      // and reports the error, as the eager head does, so a push never throws for it.
    }
  }
  if (!value || typeof value !== 'object' || (!Array.isArray(value) && (value as any).constructor !== Object))
    return value
  const out: any = Array.isArray(value) ? [] : {}
  for (const k in value)
    out[k] = copyInput((value as any)[k], k)
  return out
}
