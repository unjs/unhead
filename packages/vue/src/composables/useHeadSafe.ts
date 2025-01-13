import type { ActiveHeadEntry } from '@unhead/schema'
import type { UseHeadOptions, UseHeadSafeInput } from '../'
import { whitelistSafeInput } from '@unhead/shared'
import { useHead } from './useHead'

export function useHeadSafe(input: UseHeadSafeInput, options: UseHeadOptions = {}): ActiveHeadEntry<any> {
  // @ts-expect-error untyped
  return useHead(input, { ...options, transform: whitelistSafeInput })
}
