// Deep equality of resolved head input: plain objects, lists, and primitives. Another
// object, such as a promise, equals only itself.
export function sameInput(a: any, b: any): boolean {
  if (a === b)
    return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || a.constructor !== b.constructor || (a.constructor !== Object && !Array.isArray(a)))
    return false
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every(key => sameInput(a[key], b[key]))
}
