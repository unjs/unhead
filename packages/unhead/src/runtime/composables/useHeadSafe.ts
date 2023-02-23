import type {
  ActiveHeadEntry,
  HeadEntryOptions, HeadSafe,
} from '@unhead/schema'
import { useHead } from './useHead'
import {whitelistSafeInput} from "../..";

export function useHeadSafe(input: HeadSafe, options: HeadEntryOptions = {}): ActiveHeadEntry<HeadSafe> | void {
  // @ts-expect-error untyped
  return useHead(input, {
    ...(options || {}),
    transform: whitelistSafeInput,
  })
}
