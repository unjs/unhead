import type { HeadEntryOptions, MergeHead } from '@unhead/schema'
import type { UseHeadInput } from '../../types'
import { useHeadSafe } from '.'

export function useServerHeadSafe<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}) {
  return useHeadSafe(input, { ...options, mode: 'server' })
}
