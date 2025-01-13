import type { ActiveHeadEntry } from '@unhead/schema'
import type { UseHeadOptions, UseSeoMetaInput } from '../types'
import { unpackMeta } from '@unhead/shared'
import { useHead } from './useHead'

export function useSeoMeta(input: UseSeoMetaInput, options?: UseHeadOptions): ActiveHeadEntry<any> {
  const { title, titleTemplate, ...meta } = input
  return useHead({
    title,
    titleTemplate,
    // @ts-expect-error runtime type
    _flatMeta: meta,
  }, {
    ...options,
    transform(t) {
      // @ts-expect-error runtime type
      const meta = unpackMeta({ ...t._flatMeta })
      // @ts-expect-error runtime type
      delete t._flatMeta
      return {
        // @ts-expect-error runtime type
        ...t,
        meta,
      }
    },
  })
}
