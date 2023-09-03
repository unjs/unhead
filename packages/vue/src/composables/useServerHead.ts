import type { HeadEntryOptions, MergeHead } from '@unhead/schema'
import type { UseHeadInput, UseHeadOptions } from '../types'
import { injectHead } from './injectHead'

export function useServerHead<T extends MergeHead>(input: UseHeadInput<T>, options: UseHeadOptions = {}) {
  // ensure server mode
  const head = options.head || injectHead()
  delete options.head
  if (head)
    return head.push(input, { ...options as HeadEntryOptions, mode: 'server' })
}
