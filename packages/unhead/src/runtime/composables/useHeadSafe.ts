import type {
  ActiveHeadEntry,
  HeadEntryOptions, HeadSafe,
} from '@unhead/schema'
import { whitelistSafeInput } from '../..'
import { useHead } from './useHead'

export function useHeadSafe(input: HeadSafe, options: HeadEntryOptions = {}): ActiveHeadEntry<HeadSafe> | void {
  // @ts-expect-error untyped
  return useHead(input, {
    ...(options || {}),
    transform: whitelistSafeInput,
  })
}
