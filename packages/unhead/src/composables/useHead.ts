import type {
  ActiveHeadEntry,
  Head,
  HeadEntryOptions,
} from '@unhead/schema'
import { getActiveHead } from './useActiveHead'

export function useHead<T extends Head>(input: T, options: HeadEntryOptions = {}): ActiveHeadEntry<T> | void {
  return getActiveHead()?.push(input, options)
}
