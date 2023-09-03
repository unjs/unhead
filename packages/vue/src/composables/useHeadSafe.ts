import type { ActiveHeadEntry } from '@unhead/schema'
import { whitelistSafeInput } from '@unhead/shared'
import type { UseHeadOptions, UseHeadSafeInput } from '../'
import { useHead } from './useHead'

export function useHeadSafe(input: UseHeadSafeInput, options: UseHeadOptions = {}): ActiveHeadEntry<UseHeadSafeInput> | void {
  // @ts-expect-error untyped
  return useHead(input, { ...options, transform: whitelistSafeInput })
}
