import type { ActiveHeadEntry, MetaFlatInput, Title, TitleTemplate } from '@unhead/schema'
import { unpackMeta } from 'zhead'
import { useHead } from 'unhead'

export type UseSeoMetaInput = MetaFlatInput & { title?: Title; titleTemplate?: TitleTemplate }

export const useSeoMeta = (input: UseSeoMetaInput): ActiveHeadEntry<any> | void => {
  const { title, titleTemplate, ...meta } = input
  return useHead({
    title,
    titleTemplate,
    meta: unpackMeta(meta),
  })
}
