import type { ActiveHeadEntry, MergeHead } from '@unhead/schema'
import type { UseHeadInput, UseHeadOptions } from '../types'
import { useHead } from './useHead'

export function useServerHead<T extends MergeHead>(input: UseHeadInput<T>, options: UseHeadOptions = {}): ActiveHeadEntry<any> {
  return useHead<T>(input, { ...options, mode: 'server' })
}
