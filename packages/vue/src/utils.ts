import type { ResolvedHead } from 'unhead/types'
import { walkResolver } from 'unhead/utils'
import { VueResolver } from './resolver'

export { VueResolver }
export * from 'unhead/utils'

/**
 * @deprecated Use head.resolveTags() instead.
 */
export function resolveUnrefHeadInput(input: any): ResolvedHead {
  return walkResolver(input, VueResolver)
}
