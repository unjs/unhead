import { resolveUnref } from '@vueuse/shared'
import { unref } from 'vue'
import { HasElementTags } from 'unhead'
import type { Arrayable } from './types'

export function resolveUnrefHeadInput(ref: any, lastKey: string | number = ''): any {
  const root = resolveUnref(ref)
  if (!ref || !root)
    return root

  if (Array.isArray(root))
    return root.map(r => resolveUnrefHeadInput(r, lastKey))

  if (typeof root === 'object') {
    const unrefdObj = Object.fromEntries(
      Object.entries(root).map(([key, value]) => {
        // title template and raw dom events should stay function, we support a ref'd string though
        if (key === 'titleTemplate' || key.startsWith('on'))
          return [key, unref(value)]
        return [key, resolveUnrefHeadInput(value, key)]
      }),
    )
    // flag any tags which are dynamic
    if (HasElementTags.includes(String(lastKey)) && JSON.stringify(unrefdObj) !== JSON.stringify(root))
      unrefdObj._dynamic = true

    return unrefdObj
  }
  return root
}

export function asArray<T>(value: Arrayable<T>): T[] {
  return Array.isArray(value) ? value : [value]
}
