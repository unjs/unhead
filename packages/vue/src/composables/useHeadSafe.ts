import type { ActiveHeadEntry, HeadEntryOptions } from '@unhead/schema'
import { whitelistSafeInput } from 'unhead'
import type { UseHeadSafeInput } from '../'
import { useHead } from '.'

export function useHeadSafe(input: UseHeadSafeInput, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadSafeInput> | void {
  // @ts-expect-error untyped
  return useHead(input, { ...options, transform: whitelistSafeInput })
}
