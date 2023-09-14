import { toValue} from 'vue'

export function resolveUnrefHeadInput(ref: any, lastKey: string | number = ''): any {
  // allow promises to bubble through
  if (ref instanceof Promise)
    return ref
  const root = toValue(ref)
  if (!ref || !root)
    return root

  if (Array.isArray(root))
    return root.map(r => resolveUnrefHeadInput(r, lastKey))

  if (typeof root === 'object') {
    return Object.fromEntries(
      Object.entries(root).map(([k, v]) => {
        // title template and raw dom events should stay functions, we support a ref'd string though
        if (k === 'titleTemplate' || k.startsWith('on'))
          return [k, toValue(v)]
        return [k, resolveUnrefHeadInput(v, k)]
      }),
    )
  }
  return root
}
