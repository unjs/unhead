import type { HeadEntryOptions } from '@unhead/schema'
import type { UseHeadSafeInput } from '../../types'
import { useHeadSafe } from '.'

export function useServerHeadSafe(input: UseHeadSafeInput, options: HeadEntryOptions = {}) {
  return useHeadSafe(input, { ...options, mode: 'server' })
}
