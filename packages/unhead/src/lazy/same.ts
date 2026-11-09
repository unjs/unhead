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

// A copy of resolved head input down to the props of each tag, so an input that the app edits
// in place, as a reactive object, keeps the values it had. Deeper values, such as JSON-LD
// content or objects from app state, stay shared: copying them could walk a whole app.
export function copyInput<T>(value: T, depth = 0): T {
  if (depth > 4 || !value || typeof value !== 'object' || (!Array.isArray(value) && (value as any).constructor !== Object))
    return value
  const out: any = Array.isArray(value) ? [] : {}
  for (const key in value)
    out[key] = copyInput((value as any)[key], depth + 1)
  return out
}
