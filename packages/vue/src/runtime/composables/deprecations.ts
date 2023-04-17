import { asArray } from '@unhead/shared'
import type { ActiveHeadEntry, MetaFlatInput } from '@unhead/schema'
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

/**
 * @deprecated Use `useHead`
 */
export function useTagTitle(title: ReactiveHead['title']): ActiveHeadEntry<any> | void {
  return useHead({ title })
}

/**
 * @deprecated Use `useHead`
 */
export function useTitleTemplate(titleTemplate: ReactiveHead['titleTemplate']): ActiveHeadEntry<any> | void {
  return useHead({ titleTemplate })
}

/**
 * @deprecated Use `useHead`
 */
export function useTagMeta(meta: Arrayable<Meta>): ActiveHeadEntry<any> | void {
  return useHead({ meta: asArray(meta) })
}

/**
 * @deprecated Use `useHead`
 */
export function useTagMetaFlat(meta: MaybeComputedRefEntries<MetaFlatInput>): ActiveHeadEntry<any> | void {
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
export function useTagLink(link: Arrayable<Link>): ActiveHeadEntry<any> | void {
  return useHead({ link: asArray(link) })
}
/**
 * @deprecated Use `useHead`
 */
export function useTagScript(script: Arrayable<Script>): ActiveHeadEntry<any> | void {
  return useHead({ script: asArray(script) })
}
/**
 * @deprecated Use `useHead`
 */
export function useTagStyle(style: Arrayable<Style>): ActiveHeadEntry<any> | void {
  return useHead({ style: asArray(style) })
}
/**
 * @deprecated Use `useHead`
 */
export function useTagNoscript(noscript: Arrayable<Noscript>): ActiveHeadEntry<any> | void {
  return useHead({ noscript: asArray(noscript) })
}
/**
 * @deprecated Use `useHead`
 */
export function useTagBase(base: ReactiveHead['base']): ActiveHeadEntry<any> | void {
  return useHead({ base })
}
/**
 * @deprecated Use `useHead`
 */
export function useHtmlAttrs(attrs: ReactiveHead['htmlAttrs']): ActiveHeadEntry<any> | void {
  return useHead({ htmlAttrs: attrs })
}
/**
 * @deprecated Use `useHead`
 */
export function useBodyAttrs(attrs: ReactiveHead['bodyAttrs']): ActiveHeadEntry<any> | void {
  return useHead({ bodyAttrs: attrs })
}
/**
 * @deprecated Use `useHead`
 */
export function useServerTagTitle(title: ReactiveHead['title']): ActiveHeadEntry<any> | void {
  return useServerHead({ title })
}
/**
 * @deprecated Use `useHead`
 */
export function useServerTitleTemplate(titleTemplate: ReactiveHead['titleTemplate']): ActiveHeadEntry<any> | void {
  return useServerHead({ titleTemplate })
}
/**
 * @deprecated Use `useHead`
 */
export function useServerTagMeta(meta: Arrayable<Meta>): ActiveHeadEntry<any> | void {
  return useServerHead({ meta: asArray(meta) })
}
/**
 * @deprecated Use `useHead`
 */
export function useServerTagMetaFlat(meta: MaybeComputedRefEntries<MetaFlatInput>): ActiveHeadEntry<any> | void {
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
export function useServerTagLink(link: Arrayable<Link>): ActiveHeadEntry<any> | void {
  return useServerHead({ link: asArray(link) })
}
/**
 * @deprecated Use `useHead`
 */
export function useServerTagScript(script: Arrayable<Script>): ActiveHeadEntry<any> | void {
  return useServerHead({ script: asArray(script) })
}
/**
 * @deprecated Use `useHead`
 */
export function useServerTagStyle(style: Arrayable<Style>): ActiveHeadEntry<any> | void {
  return useServerHead({ style: asArray(style) })
}
/**
 * @deprecated Use `useHead`
 */
export function useServerTagNoscript(noscript: Arrayable<Noscript>): ActiveHeadEntry<any> | void {
  return useServerHead({ noscript: asArray(noscript) })
}
/**
 * @deprecated Use `useHead`
 */
export function useServerTagBase(base: ReactiveHead['base']): ActiveHeadEntry<any> | void {
  return useServerHead({ base })
}
/**
 * @deprecated Use `useHead`
 */
export function useServerHtmlAttrs(attrs: ReactiveHead['htmlAttrs']): ActiveHeadEntry<any> | void {
  return useServerHead({ htmlAttrs: attrs })
}
/**
 * @deprecated Use `useHead`
 */
export function useServerBodyAttrs(attrs: ReactiveHead['bodyAttrs']): ActiveHeadEntry<any> | void {
  return useHead({ bodyAttrs: attrs })
}
