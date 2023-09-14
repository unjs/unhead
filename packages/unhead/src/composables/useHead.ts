import type {
  ActiveHeadEntry,
  Head,
  HeadEntryOptions,
} from '@unhead/schema'
import { getActiveHead } from './useActiveHead'

export function useHead<T extends Head>(input: T, options: HeadEntryOptions = {}): ActiveHeadEntry<T> | void {
  const head = options.head || injectHead()
  return head?.push(input, options)
}
