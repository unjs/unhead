import type {
  ActiveHeadEntry,
  Base, Link,
  MetaFlatInput,
  Noscript,
  BodyAttributes,
  HtmlAttributes,
  Meta,
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
export const useTagTitle = (title: Title): ActiveHeadEntry<any> | void => useHead({ title })

/**
 * @deprecated Use `useHead`
 */
export const useTagBase = (base: Base): ActiveHeadEntry<any> | void => useHead({ base })

/**
 * @deprecated Use `useHead`
 */
export const useTagMeta = (meta: Arrayable<Meta>): ActiveHeadEntry<any> | void => useHead({ meta: asArray(meta) })

/**
 * @deprecated Use `useHead`
 */
export const useTagMetaFlat = (meta: MetaFlatInput): ActiveHeadEntry<any> | void => useTagMeta(unpackMeta(meta))

/**
 * @deprecated Use `useHead`
 */
export const useTagLink = (link: Arrayable<Link>): ActiveHeadEntry<any> | void => useHead({ link: asArray(link) })

/**
 * @deprecated Use `useHead`
 */
export const useTagScript = (script: Arrayable<Script>): ActiveHeadEntry<any> | void => useHead({ script: asArray(script) })

/**
 * @deprecated Use `useHead`
 */
export const useTagStyle = (style: Arrayable<Style>): ActiveHeadEntry<any> | void => useHead({ style: asArray(style) })

/**
 * @deprecated Use `useHead`
 */
export const useTagNoscript = (noscript: Arrayable<Noscript>): ActiveHeadEntry<any> | void => useHead({ noscript: asArray(noscript) })

/**
 * @deprecated Use `useHead`
 */
export const useHtmlAttrs = (attrs: HtmlAttributes): ActiveHeadEntry<any> | void => useHead({ htmlAttrs: attrs })

/**
 * @deprecated Use `useHead`
 */
export const useBodyAttrs = (attrs: BodyAttributes): ActiveHeadEntry<any> | void => useHead({ bodyAttrs: attrs })

/**
 * @deprecated Use `useHead`
 */
export const useTitleTemplate = (titleTemplate: TitleTemplate): ActiveHeadEntry<any> | void => useHead({ titleTemplate })

/**
 * @deprecated Use `useHead`
 */
export const useServerTagTitle = (title: Title): ActiveHeadEntry<any> | void => useServerHead({ title })
/**
 * @deprecated Use `useServerHead`
 */
export const useServerTagBase = (base: Base): ActiveHeadEntry<any> | void => useServerHead({ base })
/**
 * @deprecated Use `useServerHead`
 */
export const useServerTagMeta = (meta: Arrayable<Meta>): ActiveHeadEntry<any> | void => useServerHead({ meta: asArray(meta) })
/**
 * @deprecated Use `useServerHead`
 */
export const useServerTagMetaFlat = (meta: MetaFlatInput): ActiveHeadEntry<any> | void => useServerTagMeta(unpackMeta(meta))
/**
 * @deprecated Use `useServerHead`
 */
export const useServerTagLink = (link: Arrayable<Link>): ActiveHeadEntry<any> | void => useServerHead({ link: asArray(link) })
/**
 * @deprecated Use `useServerHead`
 */
export const useServerTagScript = (script: Arrayable<Script>): ActiveHeadEntry<any> | void => useServerHead({ script: asArray(script) })
/**
 * @deprecated Use `useServerHead`
 */
export const useServerTagStyle = (style: Arrayable<Style>): ActiveHeadEntry<any> | void => useServerHead({ style: asArray(style) })
/**
 * @deprecated Use `useServerHead`
 */
export const useServerTagNoscript = (noscript: Arrayable<Noscript>): ActiveHeadEntry<any> | void => useServerHead({ noscript: asArray(noscript) })
/**
 * @deprecated Use `useServerHead`
 */
export const useServerHtmlAttrs = (attrs: HtmlAttributes): ActiveHeadEntry<any> | void => useServerHead({ htmlAttrs: attrs })
/**
 * @deprecated Use `useServerHead`
 */
export const useServerBodyAttrs = (attrs: BodyAttributes): ActiveHeadEntry<any> | void => useServerHead({ bodyAttrs: attrs })
/**
 * @deprecated Use `useServerHead`
 */
export const useServerTitleTemplate = (titleTemplate: TitleTemplate): ActiveHeadEntry<any> | void => useServerHead({ titleTemplate })
