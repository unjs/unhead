function isFunctionValue(key?: string): boolean {
  return key === 'titleTemplate' || !!key?.startsWith('on')
}

// Keep the original values when the app edits a plain object or list in place.
export function copyInput<T>(value: T, key?: string): T {
  // the resolver leaves a schema.org node resolver as it is
  if (key === '_resolver')
    return value
  if (typeof value === 'function' && !isFunctionValue(key)) {
    try {
      // Adoption needs the original value even if the getter changes before load.
      const resolved = value()
      const snapshot = typeof resolved === 'function' ? resolved : copyInput(resolved)
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
    out[k] = copyInput((value as any)[k], k)
  return out
}
