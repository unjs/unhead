import type { ResolvableHead } from 'unhead/types'
import type { UseHeadInput } from './types'
import { walkResolver } from 'unhead/utils'
import { VueResolver } from './resolver'

export { VueResolver }
export * from 'unhead/utils'

/**
 * @deprecated Use `resolveTags(head)` from `unhead/utils` instead.
 */
export function resolveUnrefHeadInput(input: UseHeadInput): ResolvableHead | false | null | undefined {
  return walkResolver(input, VueResolver) as ResolvableHead | false | null | undefined
}
