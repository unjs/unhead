import type {
  ActiveHeadEntry,
  Head,
  HeadEntryOptions,
} from '@unhead/schema'
import { useHead } from './useHead'

export function useServerHead<T extends Head>(input: T, options: HeadEntryOptions = {}): ActiveHeadEntry<T> | void {
  return useHead(input, { ...options, mode: 'server' })
}
