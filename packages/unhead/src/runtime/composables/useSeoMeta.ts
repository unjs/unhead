import type { ActiveHeadEntry, HeadEntryOptions, MetaFlatInput, Title, TitleTemplate } from '@unhead/schema'
import { unpackMeta } from '../..'
import { useHead } from './useHead'

export type UseSeoMetaInput = MetaFlatInput & { title?: Title; titleTemplate?: TitleTemplate }

export function useSeoMeta(input: UseSeoMetaInput, options?: HeadEntryOptions): ActiveHeadEntry<any> | void {
  const { title, titleTemplate, ...meta } = input
  return useHead({
    title,
    titleTemplate,
    meta: unpackMeta(meta),
  }, options)
}
