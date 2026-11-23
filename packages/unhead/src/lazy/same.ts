// Keep the original values when the app edits a plain object or list in place.
export function copyInput<T>(value: T, key?: string): T {
  if (typeof value === 'function') {
    // Preserve callbacks and schema.org resolvers for the normal resolver.
    if (/^(?:on|_resolver$|titleTemplate$)/.test(key ?? ''))
      return value
    try {
      // Adoption needs the original value even if the getter changes before load.
      const snapshot = copyInput(value(), '_resolver')
      return (() => snapshot) as T
    }
    catch {
      // Let the renderer handle the error if a getter is still unavailable then.
      return value
    }
  }
  const out: any = Array.isArray(value) ? [] : value?.constructor === Object ? {} : undefined
  if (!out)
    return value
  for (const k in value)
    out[k] = copyInput((value as any)[k], k)
  return out
}
