import type { ActiveHeadEntry, HeadEntryOptions, MergeHead } from '@unhead/schema'
import type { UseHeadInput } from '../../'
import {useHead } from './useHead'
import {whitelistSafeInput} from "unhead";

export function useHeadSafe<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput<T>> | void {
  // @ts-expect-error untyped
  return useHead(input, { ...options, transform: whitelistSafeInput })
}
