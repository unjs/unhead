import { isValidElement } from 'react'

function resolveUnref(r: any) {
  if (typeof r === 'object' && 'current' in r) {
    return r.current
  }
  return r
}

function resolveGetterUnref(r: any) {
  if (typeof r === 'function') {
    return r()
  }
  return resolveUnref(r)
}

export function resolveUnrefHeadInput(ref: any): any {
  // allow promises to bubble through
  if (typeof ref === 'string' || ref instanceof Promise || ref instanceof Date || ref instanceof RegExp)
    return ref

  const root = resolveGetterUnref(ref)
  if (!ref || !root)
    return root

  if (Array.isArray(root)) {
    return root.map(r => resolveUnrefHeadInput(r))
  }

  if (typeof root === 'object' && !isValidElement(root)) {
    const resolved: Record<string, string> = {}

    for (const k in root) {
      if (!Object.prototype.hasOwnProperty.call(root, k)) {
        continue
      }

      if (k === 'titleTemplate' || (k[0] === 'o' && k[1] === 'n')) {
        resolved[k] = resolveUnref(root[k])
        continue
      }

      resolved[k] = resolveUnrefHeadInput(root[k])
    }

    return resolved
  }

  return root
}
