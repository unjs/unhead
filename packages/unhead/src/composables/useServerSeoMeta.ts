import type { ActiveHeadEntry, HeadEntryOptions, UseSeoMetaInput } from '@unhead/schema'
import { useSeoMeta } from './useSeoMeta'

export function useServerSeoMeta(input: UseSeoMetaInput, options?: HeadEntryOptions): ActiveHeadEntry<any> {
  return useSeoMeta(input, {
    ...options,
    mode: 'server',
  })
}
