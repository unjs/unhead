import type { MergeHead } from '@unhead/schema'
import type { UseHeadInput, UseHeadOptions } from '../types'
import { useHead } from './useHead'

export function useServerHead<T extends MergeHead>(input: UseHeadInput<T>, options: UseHeadOptions = {}) {
  return useHead(input, { ...options, mode: 'server' })
}
