import { unref } from 'vue'

// copied from @vueuse/shared
function resolveUnref(r: any) {
  return typeof r === 'function' ? r() : unref(r)
}

export function resolveUnrefHeadInput(ref: any): any {
  // allow promises to bubble through
  if (ref instanceof Promise)
    return ref
  const root = resolveUnref(ref)
  if (!ref || !root)
    return root

  if (Array.isArray(root))
    return root.map(r => resolveUnrefHeadInput(r))

  if (typeof root === 'object') {
    const resolved: Record<string, string> = {}

    for (const k in root) {
      if (!Object.prototype.hasOwnProperty.call(root, k)) {
        continue
      }

      if (k === 'titleTemplate' || (k[0] === 'o' && k[1] === 'n')) {
        resolved[k] = unref(root[k])

        continue
      }

      resolved[k] = resolveUnrefHeadInput(root[k])
    }

    return resolved
  }

  return root
}
