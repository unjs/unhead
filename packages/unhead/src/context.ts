import type { Head, MergeHead, Unhead } from '@unhead/schema'
import { getContext } from 'unctx'

type UnheadInstance = Unhead<Head<MergeHead>>

export const unheadCtx = getContext<Unhead<any>>('unhead')

/**
 * Get access to Unhead instance.
 *
 * Throws an error if Unhead instance is unavailable.
 * @example
 * ```js
 * const unhead = useUnhead()
 * ```
 */
export function useUnhead<T extends UnheadInstance>(): T {
  const instance = unheadCtx.tryUse()
  if (!instance) {
    throw new Error('Unhead instance is unavailable!')
  }
  return instance as T
}

/**
 * Get access to Unhead instance.
 *
 * Returns null if Unhead instance is unavailable.
 * @example
 * ```js
 * const unhead = tryUseUnhead()
 * if (unhead) {
 *  // Do something
 * }
 * ```
 */
export function tryUseUnhead<T extends UnheadInstance>(): T | null {
  return unheadCtx.tryUse() as T
}
