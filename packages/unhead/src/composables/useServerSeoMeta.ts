import type { ActiveHeadEntry, HeadEntryOptions } from '@unhead/schema'
import type { UseSeoMetaInput } from 'unhead'
import { useSeoMeta } from '.'

export function useServerSeoMeta(input: UseSeoMetaInput, options?: HeadEntryOptions): ActiveHeadEntry<any> | void {
  return useSeoMeta(input, {
    ...(options || {}),
    mode: 'server',
  })
}
