import type {
  ActiveHeadEntry,
  HeadEntryOptions,
  HeadSafe,
} from '@unhead/schema'
import { useHeadSafe } from './useHeadSafe'

export function useServerHeadSafe<T extends HeadSafe>(input: T, options: HeadEntryOptions = {}): ActiveHeadEntry<T> {
  return useHeadSafe(input, { ...options, mode: 'server' })
}
