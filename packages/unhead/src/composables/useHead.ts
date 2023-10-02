import type {
  ActiveHeadEntry,
  Head,
  HeadEntryOptions,
  MergeHead,
  Unhead,
} from '@unhead/schema'
import { getActiveHead } from './useActiveHead'

export type UseHeadInput<T extends MergeHead> = Head<T>

export function useHead<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput<T>> | void {
  const head = (options.head || getActiveHead()) as Unhead<UseHeadInput<T>>
  return head?.push(input, options)
}
