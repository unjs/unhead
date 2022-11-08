import type { HeadEntryOptions } from '@unhead/schema'
import type { UseHeadInput } from '../..'
import { injectHead } from '../..'

export function useHead(input: UseHeadInput = {}, options: HeadEntryOptions = {}) {
  const head = injectHead()
  head.push(input, options)
}

