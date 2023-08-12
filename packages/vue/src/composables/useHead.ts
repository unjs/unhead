import type { ActiveHeadEntry, HeadEntryOptions, MergeHead } from '@unhead/schema'
import type { UseHeadInput } from '@unhead/vue'
import { injectHead } from '../'
import { clientUseHead } from './util/clientUseHead'

export function useHead<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput<T>> | void {
  const head = injectHead()
  if (!head.ssr)
    return clientUseHead(head, input, options)
  return head.push(input, options)
}
