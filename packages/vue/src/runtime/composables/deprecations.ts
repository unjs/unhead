import { asArray } from '@unhead/shared'
import type { MetaFlatInput } from '@unhead/schema'
import { ref, watchEffect } from 'vue'
import { unpackMeta } from 'unhead'
import {
  resolveUnrefHeadInput, useHead, useServerHead,
} from '../../'
import type {
  Arrayable,
  Link,
  MaybeComputedRefEntries,
  Meta, Noscript,
  ReactiveHead,
  Script,
  Style,
} from '../../'
import {ActiveHeadEntry} from "@unhead/schema";

/**
 * @deprecated Use `useHead`
 */
export const useTagTitle = (title: ReactiveHead['title']) : ActiveHeadEntry<any> | void => useHead({ title })

/**
 * @deprecated Use `useHead`
 */
export const useTitleTemplate = (titleTemplate: ReactiveHead['titleTemplate']) : ActiveHeadEntry<any> | void => useHead({ titleTemplate })

/**
 * @deprecated Use `useHead`
 */
export const useTagMeta = (meta: Arrayable<Meta>) : ActiveHeadEntry<any> | void => useHead({ meta: asArray(meta) })

/**
 * @deprecated Use `useHead`
 */
export const useTagMetaFlat = (meta: MaybeComputedRefEntries<MetaFlatInput>) : ActiveHeadEntry<any> | void => {
  const input: any = ref({})
  watchEffect(() => {
    // need to unref data so we can unpack it properly
    input.value = unpackMeta(resolveUnrefHeadInput(meta))
  })
  return useHead({ meta: input })
}

/**
 * @deprecated Use `useHead`
 */
export const useTagLink = (link: Arrayable<Link>) : ActiveHeadEntry<any> | void => useHead({ link: asArray(link) })
/**
 * @deprecated Use `useHead`
 */
export const useTagScript = (script: Arrayable<Script>) : ActiveHeadEntry<any> | void => useHead({ script: asArray(script) })
/**
 * @deprecated Use `useHead`
 */
export const useTagStyle = (style: Arrayable<Style>) : ActiveHeadEntry<any> | void => useHead({ style: asArray(style) })
/**
 * @deprecated Use `useHead`
 */
export const useTagNoscript = (noscript: Arrayable<Noscript>) : ActiveHeadEntry<any> | void => useHead({ noscript: asArray(noscript) })
/**
 * @deprecated Use `useHead`
 */
export const useTagBase = (base: ReactiveHead['base']) : ActiveHeadEntry<any> | void => useHead({ base })
/**
 * @deprecated Use `useHead`
 */
export const useHtmlAttrs = (attrs: ReactiveHead['htmlAttrs']) : ActiveHeadEntry<any> | void => useHead({ htmlAttrs: attrs })
/**
 * @deprecated Use `useHead`
 */
export const useBodyAttrs = (attrs: ReactiveHead['bodyAttrs']) : ActiveHeadEntry<any> | void => useHead({ bodyAttrs: attrs })
/**
 * @deprecated Use `useHead`
 */
export const useServerTagTitle = (title: ReactiveHead['title']) : ActiveHeadEntry<any> | void => useServerHead({ title })
/**
 * @deprecated Use `useHead`
 */
export const useServerTitleTemplate = (titleTemplate: ReactiveHead['titleTemplate']) : ActiveHeadEntry<any> | void => useServerHead({ titleTemplate })
/**
 * @deprecated Use `useHead`
 */
export const useServerTagMeta = (meta: Arrayable<Meta>) : ActiveHeadEntry<any> | void => useServerHead({ meta: asArray(meta) })
/**
 * @deprecated Use `useHead`
 */
export const useServerTagMetaFlat = (meta: MaybeComputedRefEntries<MetaFlatInput>) : ActiveHeadEntry<any> | void => {
  const input: any = ref({})
  watchEffect(() => {
    // need to unref data so we can unpack it properly
    input.value = unpackMeta(resolveUnrefHeadInput(meta))
  })
  return useServerHead({ meta: input })
}
/**
 * @deprecated Use `useHead`
 */
export const useServerTagLink = (link: Arrayable<Link>) : ActiveHeadEntry<any> | void => useServerHead({ link: asArray(link) })
/**
 * @deprecated Use `useHead`
 */
export const useServerTagScript = (script: Arrayable<Script>) : ActiveHeadEntry<any> | void => useServerHead({ script: asArray(script) })
/**
 * @deprecated Use `useHead`
 */
export const useServerTagStyle = (style: Arrayable<Style>) : ActiveHeadEntry<any> | void => useServerHead({ style: asArray(style) })
/**
 * @deprecated Use `useHead`
 */
export const useServerTagNoscript = (noscript: Arrayable<Noscript>) : ActiveHeadEntry<any> | void => useServerHead({ noscript: asArray(noscript) })
/**
 * @deprecated Use `useHead`
 */
export const useServerTagBase = (base: ReactiveHead['base']) : ActiveHeadEntry<any> | void => useServerHead({ base })
/**
 * @deprecated Use `useHead`
 */
export const useServerHtmlAttrs = (attrs: ReactiveHead['htmlAttrs']) : ActiveHeadEntry<any> | void => useServerHead({ htmlAttrs: attrs })
/**
 * @deprecated Use `useHead`
 */
export const useServerBodyAttrs = (attrs: ReactiveHead['bodyAttrs']) : ActiveHeadEntry<any> | void => useHead({ bodyAttrs: attrs })
