import { isSignal, untracked } from '@angular/core'

function resolveSignal(r: any) {
  return typeof r === 'function' ? r() : isSignal(r) ? r() : r
}

export function resolveSignalHeadInput(signal: any): any {
  if (signal instanceof Promise || signal instanceof Date || signal instanceof RegExp)
    return signal

  const root = resolveSignal(signal)
  if (!signal || !root)
    return root

  if (Array.isArray(root))
    return root.map(r => resolveSignalHeadInput(r))

  if (typeof root === 'object') {
    const resolved: Record<string, any> = {}

    for (const k in root) {
      if (!Object.prototype.hasOwnProperty.call(root, k)) {
        continue
      }

      if (k === 'titleTemplate' || (k[0] === 'o' && k[1] === 'n')) {
        resolved[k] = isSignal(root[k]) ? untracked(() => root[k]()) : root[k]
        continue
      }

      resolved[k] = resolveSignalHeadInput(root[k])
    }

    return resolved
  }

  return root
}
