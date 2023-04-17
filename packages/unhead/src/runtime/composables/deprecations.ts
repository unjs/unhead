import type {
  ActiveHeadEntry,
  Base, BodyAttributes,
  HtmlAttributes,
  Link,
  Meta,
  MetaFlatInput,
  Noscript,
  Script,
  Style,
  Title, TitleTemplate,
} from '@unhead/schema'
import type { Arrayable } from '@unhead/shared'
import { asArray } from '@unhead/shared'
import { unpackMeta, useHead, useServerHead } from '../../'

/**
 * @deprecated Use `useHead`
 */
export function useTagTitle(title: Title): ActiveHeadEntry<any> | void {
  return useHead({ title })
}

/**
 * @deprecated Use `useHead`
 */
export function useTagBase(base: Base): ActiveHeadEntry<any> | void {
  return useHead({ base })
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
export function useTagMetaFlat(meta: MetaFlatInput): ActiveHeadEntry<any> | void {
  return useTagMeta(unpackMeta(meta))
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
export function useHtmlAttrs(attrs: HtmlAttributes): ActiveHeadEntry<any> | void {
  return useHead({ htmlAttrs: attrs })
}

/**
 * @deprecated Use `useHead`
 */
export function useBodyAttrs(attrs: BodyAttributes): ActiveHeadEntry<any> | void {
  return useHead({ bodyAttrs: attrs })
}

/**
 * @deprecated Use `useHead`
 */
export function useTitleTemplate(titleTemplate: TitleTemplate): ActiveHeadEntry<any> | void {
  return useHead({ titleTemplate })
}

/**
 * @deprecated Use `useHead`
 */
export function useServerTagTitle(title: Title): ActiveHeadEntry<any> | void {
  return useServerHead({ title })
}
/**
 * @deprecated Use `useServerHead`
 */
export function useServerTagBase(base: Base): ActiveHeadEntry<any> | void {
  return useServerHead({ base })
}
/**
 * @deprecated Use `useServerHead`
 */
export function useServerTagMeta(meta: Arrayable<Meta>): ActiveHeadEntry<any> | void {
  return useServerHead({ meta: asArray(meta) })
}
/**
 * @deprecated Use `useServerHead`
 */
export function useServerTagMetaFlat(meta: MetaFlatInput): ActiveHeadEntry<any> | void {
  return useServerTagMeta(unpackMeta(meta))
}
/**
 * @deprecated Use `useServerHead`
 */
export function useServerTagLink(link: Arrayable<Link>): ActiveHeadEntry<any> | void {
  return useServerHead({ link: asArray(link) })
}
/**
 * @deprecated Use `useServerHead`
 */
export function useServerTagScript(script: Arrayable<Script>): ActiveHeadEntry<any> | void {
  return useServerHead({ script: asArray(script) })
}
/**
 * @deprecated Use `useServerHead`
 */
export function useServerTagStyle(style: Arrayable<Style>): ActiveHeadEntry<any> | void {
  return useServerHead({ style: asArray(style) })
}
/**
 * @deprecated Use `useServerHead`
 */
export function useServerTagNoscript(noscript: Arrayable<Noscript>): ActiveHeadEntry<any> | void {
  return useServerHead({ noscript: asArray(noscript) })
}
/**
 * @deprecated Use `useServerHead`
 */
export function useServerHtmlAttrs(attrs: HtmlAttributes): ActiveHeadEntry<any> | void {
  return useServerHead({ htmlAttrs: attrs })
}
/**
 * @deprecated Use `useServerHead`
 */
export function useServerBodyAttrs(attrs: BodyAttributes): ActiveHeadEntry<any> | void {
  return useServerHead({ bodyAttrs: attrs })
}
/**
 * @deprecated Use `useServerHead`
 */
export function useServerTitleTemplate(titleTemplate: TitleTemplate): ActiveHeadEntry<any> | void {
  return useServerHead({ titleTemplate })
}
