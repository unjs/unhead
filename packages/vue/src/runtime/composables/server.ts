import type { HeadEntryOptions, MergeHead, MetaFlatInput } from '@unhead/schema'
import { ref, watchEffect } from 'vue'
import { unpackMeta } from 'unhead'
import { asArray } from '@unhead/shared'
import type {
  Arrayable, Link, MaybeComputedRefEntries, Meta,
  Noscript,
  ReactiveHead,
  Script,
  Style, UseHeadInput,
} from '../../types'
import { resolveUnrefHeadInput } from '../../'
import { useHead } from '.'

export function useServerHead<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}) {
  // ensure server mode
  return useHead(input, { ...options, mode: 'server' })
}
export const useServerTagTitle = (title: ReactiveHead['title']) => useServerHead({ title })

export const useServerTitleTemplate = (titleTemplate: ReactiveHead['titleTemplate']) => useServerHead({ titleTemplate })

export const useServerTagMeta = (meta: Arrayable<Meta>) => useServerHead({ meta: asArray(meta) })

export const useServerTagMetaFlat = (meta: MaybeComputedRefEntries<MetaFlatInput>) => {
  const input: any = ref({})
  watchEffect(() => {
    // need to unref data so we can unpack it properly
    input.value = unpackMeta(resolveUnrefHeadInput(meta))
  })
  return useServerHead({ meta: input })
}

export const useServerTagLink = (link: Arrayable<Link>) => useServerHead({ link: asArray(link) })

export const useServerTagScript = (script: Arrayable<Script>) => useServerHead({ script: asArray(script) })

export const useServerTagStyle = (style: Arrayable<Style>) => useServerHead({ style: asArray(style) })

export const useServerTagNoscript = (noscript: Arrayable<Noscript>) => useServerHead({ noscript: asArray(noscript) })

export const useServerTagBase = (base: ReactiveHead['base']) => useServerHead({ base })

export const useServerHtmlAttrs = (attrs: ReactiveHead['htmlAttrs']) => useServerHead({ htmlAttrs: attrs })

export const useServerBodyAttrs = (attrs: ReactiveHead['bodyAttrs']) => useHead({ bodyAttrs: attrs })
