export function merge(target: any, source: any): any {
  if (!source)
    return target

  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key))
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
          const byType: Record<string, any> = {}
          for (const action of merged) {
            const type = action['@type']
            if (byType[type]) {
              // merge target arrays
              if (action.target && byType[type].target)
                byType[type].target = [...new Set([...byType[type].target, ...action.target])]
            }
            else {
              byType[type] = { ...action }
            }
          }
          target[key] = Object.values(byType)
        }
        else {
          target[key] = merged
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
