export function walkResolver(ref: any, resolve: (v: any, k?: string) => any = v => v, key?: string | undefined): any {
  // allow promises to bubble through
  if (ref instanceof Date || ref instanceof RegExp || ref instanceof URL || ref === null || typeof ref === 'string' || typeof ref === 'number' || typeof ref === 'boolean')
    return ref

  const v = resolve(typeof ref === 'function' ? ref() : ref, key)

  if (Array.isArray(v)) {
    return v.map(r => walkResolver(r, resolve))
  }
  if (typeof v === 'object') {
    const result: Record<string, any> = {}

    for (const key in v) {
      if (!Object.hasOwn(v, key))
        continue
      // let upstream handle the function unfurl
      result[key] = key === 'titleTemplate' || key.startsWith('on')
        ? resolve(v[key], key)
        : walkResolver(v[key], resolve, key)
    }

    return result
  }

  return v
}
