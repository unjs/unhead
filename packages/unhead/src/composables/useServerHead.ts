import type {
  ActiveHeadEntry,
  HeadEntryOptions,
  MergeHead,
} from '@unhead/schema'
import type { UseHeadInput } from './useHead'
import { useHead } from './useHead'

export function useServerHead<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput<T>> {
  return useHead<T>(input, { ...options, mode: 'server' })
}
