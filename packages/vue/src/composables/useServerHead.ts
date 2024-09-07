import type { HeadEntryOptions, MergeHead } from '@unhead/schema'
import { injectHead } from './injectHead'
import type { UseHeadInput, UseHeadOptions } from '../types'

export function useServerHead<T extends MergeHead>(input: UseHeadInput<T>, options: UseHeadOptions = {}) {
  // ensure server mode
  const head = options.head || injectHead()
  delete options.head
  if (head)
    return head.push(input, { ...options as HeadEntryOptions, mode: 'server' })
}
