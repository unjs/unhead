import { whitelistSafeInput } from '@unhead/shared'
import type { ActiveHeadEntry } from '@unhead/schema'
import { useHead } from './useHead'
import type { UseHeadOptions, UseHeadSafeInput } from '../'

export function useHeadSafe(input: UseHeadSafeInput, options: UseHeadOptions = {}): ActiveHeadEntry<UseHeadSafeInput> | void {
  // @ts-expect-error untyped
  return useHead(input, { ...options, transform: whitelistSafeInput })
}
