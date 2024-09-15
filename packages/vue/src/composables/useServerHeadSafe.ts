import type { UseHeadOptions, UseHeadSafeInput } from '../types'
import { useHeadSafe } from './useHeadSafe'

export function useServerHeadSafe(input: UseHeadSafeInput, options: UseHeadOptions = {}) {
  return useHeadSafe(input, { ...options, mode: 'server' })
}
