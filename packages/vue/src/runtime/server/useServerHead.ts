import type { HeadEntryOptions, MergeHead } from '@unhead/schema'
import type { UseHeadInput } from '../../types'
import { useHead } from './index'

export function useServerHead<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}) {
  // ensure server mode
  useHead(input, { ...options, mode: 'server' })
}

