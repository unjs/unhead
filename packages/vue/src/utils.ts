import { walkResolver } from 'unhead/utils'
import { VueResolver } from './resolver'

export * from 'unhead/utils'

/**
 * @deprecated Use resolveTags(head) from unhead/utils instead
 */
/* @__NO_SIDE_EFFECTS__ */
export function resolveUnrefHeadInput<T extends Record<string, any>>(input: T): T {
  return walkResolver(input, VueResolver)
}

export { VueResolver }
