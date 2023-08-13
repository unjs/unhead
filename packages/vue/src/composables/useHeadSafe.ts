import type { ActiveHeadEntry, HeadEntryOptions } from '@unhead/schema'
import { whitelistSafeInput } from '@unhead/shared'
import type { UseHeadSafeInput } from '../'
import { useHead } from './useHead'

export function useHeadSafe(input: UseHeadSafeInput, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadSafeInput> | void {
  // @ts-expect-error untyped
  return useHead(input, { ...options, transform: whitelistSafeInput })
}
