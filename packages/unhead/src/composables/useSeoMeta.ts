import type { ActiveHeadEntry, HeadEntryOptions, UseSeoMetaInput } from '@unhead/schema'
import { unpackMeta } from '@unhead/shared'
import { useHead } from './useHead'

export function useSeoMeta(input: UseSeoMetaInput, options?: HeadEntryOptions): ActiveHeadEntry<any> | void {
  const { title, titleTemplate, ...meta } = input
  return useHead({
    title,
    titleTemplate,
    meta: unpackMeta(meta),
  }, options)
}
