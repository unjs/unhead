import type { HeadEntryOptions, MergeHead } from '@unhead/schema'
import type { UseHeadInput } from '../../types'
import { useHead } from '.'

export function useServerHead<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}) {
  // ensure server mode
  return useHead(input, { ...options, mode: 'server' })
}
