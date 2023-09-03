import type { HeadEntryOptions, MergeHead } from '@unhead/schema'
import type { UseHeadInput } from '../types'
import { injectHead } from './injectHead'

export function useServerHead<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}) {
  // ensure server mode
  const head = options.head || injectHead()
  if (head)
    return head.push(input, { ...options, mode: 'server' })
}
