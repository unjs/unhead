import type { ActiveHeadEntry } from '@unhead/schema'
import type { UseHeadOptions, UseSeoMetaInput } from '../types'
import { useSeoMeta } from './useSeoMeta'

export function useServerSeoMeta(input: UseSeoMetaInput, options?: UseHeadOptions): ActiveHeadEntry<UseSeoMetaInput> {
  return useSeoMeta(input, { ...options, mode: 'server' })
}
