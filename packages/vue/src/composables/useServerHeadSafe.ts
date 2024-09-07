import { useHeadSafe } from './useHeadSafe'
import type { UseHeadOptions, UseHeadSafeInput } from '../types'

export function useServerHeadSafe(input: UseHeadSafeInput, options: UseHeadOptions = {}) {
  return useHeadSafe(input, { ...options, mode: 'server' })
}
