import type { ActiveHeadEntry, HeadEntryOptions, MergeHead } from '@unhead/schema'
import { whitelistSafeInput } from 'unhead'
import type { UseHeadInput } from '../../'
import { useHead } from './useHead'

export function useHeadSafe<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput<T>> | void {
  // @ts-expect-error untyped
  return useHead(input, { ...options, transform: whitelistSafeInput })
}
