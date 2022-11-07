import { resolveUnref } from '@vueuse/shared'
import { unref } from 'vue'

export function resolveUnrefHeadInput(ref: any): any {
  const root = resolveUnref(ref)
  if (!ref || !root)
    return root

  if (Array.isArray(root))
    return root.map(resolveUnrefHeadInput)

  if (typeof root === 'object') {
    return Object.fromEntries(
      Object.entries(root).map(([key, value]) => {
        // title template must stay a function, we support a ref'd string though
        if (key === 'titleTemplate')
          return [key, unref(value)]
        return [key, resolveUnrefHeadInput(value)]
      }),
    )
  }
  return root
}
