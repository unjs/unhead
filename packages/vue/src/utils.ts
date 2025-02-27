import { walkResolver } from 'unhead/utils'
import { VueResolver } from './resolver'

export * from 'unhead/utils'

/**
 * @deprecated Use head.resolveTags() instead
 */
export function resolveUnrefHeadInput<T extends Record<string, any>>(input: T): T {
  return walkResolver(input, VueResolver)
}

export { VueResolver }
