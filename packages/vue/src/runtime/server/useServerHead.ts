import type { HeadEntryOptions } from '@unhead/schema'
import type { UseHeadInput } from '../../types'
import { useHead } from './index'

export function useServerHead(input: UseHeadInput, options: HeadEntryOptions = {}) {
  // ensure server mode
  useHead(input, { ...options, mode: 'server' })
}

