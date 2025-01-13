import type { ActiveHeadEntry } from '@unhead/schema'
import type { UseHeadOptions, UseHeadSafeInput } from '../types'
import { useHeadSafe } from './useHeadSafe'

export function useServerHeadSafe(input: UseHeadSafeInput, options: UseHeadOptions = {}): ActiveHeadEntry<any> {
  return useHeadSafe(input, { ...options, mode: 'server' })
}
