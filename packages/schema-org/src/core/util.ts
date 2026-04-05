const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export function merge(target: any, source: any): any {
  if (!source)
    return target

  for (const key in source) {
    if (!Object.hasOwn(source, key) || UNSAFE_KEYS.has(key))
      continue

    const value = source[key]
    if (value === undefined)
      continue

    // Handle array merging
    if (Array.isArray(target[key])) {
      if (Array.isArray(value)) {
        const merged = [...target[key], ...value]
        // @type should always have unique values
        if (key === '@type') {
          target[key] = [...new Set(merged)]
        }
        // itemListElement needs position recalculation after merge
        else if (key === 'itemListElement') {
          // Sort by existing position, then reassign sequential positions
          merged.sort((a, b) => (a.position || 0) - (b.position || 0))
          for (let i = 0; i < merged.length; i++)
            merged[i].position = i + 1
          target[key] = merged
        }
        // potentialAction - dedupe by @type, merge targets
        else if (key === 'potentialAction') {
          const byType: Record<string, any> = Object.create(null)
          for (const action of merged) {
            const type = action['@type']
            if (byType[type]) {
              // merge target arrays
              if (action.target && byType[type].target) {
                const a = Array.isArray(byType[type].target) ? byType[type].target : [byType[type].target]
                const b = Array.isArray(action.target) ? action.target : [action.target]
                byType[type].target = [...new Set([...a, ...b])]
              }
            }
            else {
              byType[type] = { ...action }
            }
          }
          target[key] = Object.values(byType)
        }
        else {
          // For arrays of typed schema.org objects, dedupe by @type so that
          // later definitions override earlier ones (e.g. two Products defining
          // offers with different availability values)
          const hasTypedObjects = merged.length > 0 && merged.every((item: any) =>
            item && typeof item === 'object' && item['@type'],
          )
          if (hasTypedObjects) {
            const byType: Record<string, any> = Object.create(null)
            for (const item of merged)
              byType[item['@type']] = item
            target[key] = Object.values(byType)
          }
          else {
            target[key] = merged
          }
        }
      }
      else {
        target[key] = merge(target[key], [value])
      }
    }
    // Handle nested object merging
    else if (target[key] && typeof target[key] === 'object' && typeof value === 'object' && !Array.isArray(value)) {
      target[key] = merge({ ...target[key] }, value)
    }
    // Default: use source value
    else {
      target[key] = value
    }
  }

  return target
}
