import { isRef, unref } from 'vue'
import { HasElementTags } from '@unhead/shared'

// copied from @vueuse/shared
function resolveUnref(r: any) {
  return typeof r === 'function' ? r() : unref(r)
}

export function resolveUnrefHeadInput(ref: any, lastKey: string | number = ''): any {
  // allow promises to bubble through
  if (ref instanceof Promise)
    return ref
  const root = resolveUnref(ref)
  if (!ref || !root)
    return root

  if (Array.isArray(root))
    return root.map(r => resolveUnrefHeadInput(r, lastKey))

  if (typeof root === 'object') {
    let dynamic = false
    const unrefdObj = Object.fromEntries(
      Object.entries(root).map(([k, v]) => {
        // title template and raw dom events should stay function, we support a ref'd string though
        if (k === 'titleTemplate' || k.startsWith('on'))
          return [k, unref(v)]
        if (typeof v === 'function' || isRef(v))
          dynamic = true

        return [k, resolveUnrefHeadInput(v, k)]
      }),
    )
    // flag any tags which are dynamic
    if (dynamic && HasElementTags.includes(String(lastKey)))
      unrefdObj._dynamic = true

    return unrefdObj
  }
  return root
}
