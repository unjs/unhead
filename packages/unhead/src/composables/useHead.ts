import type {
  ActiveHeadEntry,
  Head,
  HeadEntryOptions,
  MergeHead,
  Unhead,
} from '@unhead/schema'
import { useUnhead } from '../context'

export type UseHeadInput<T extends MergeHead> = Head<T>

export function useHead<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput<T>> {
  const head = (options.head || useUnhead()) as any as Unhead<UseHeadInput<T>>
  return head.push(input, options)
}
