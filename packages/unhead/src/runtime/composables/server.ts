import type {
  ActiveHeadEntry,
  Base,
  BodyAttributes,
  Head,
  HeadEntryOptions,
  HtmlAttributes,
  Link,
  Meta,
  MetaFlatInput,
  Noscript,
  Script, Style, Title,
  TitleTemplate,
} from '@unhead/schema'
import { unpackMeta } from 'zhead'
import type { Arrayable } from '../../util'
import { asArray } from '../../util'
import { useHead } from './client'

export function useServerHead<T extends Head>(input: T, options: HeadEntryOptions = {}): ActiveHeadEntry<T> | void {
  return useHead(input, { ...options, mode: 'server' })
}

export const useServerTagTitle = (title: Title): ActiveHeadEntry<any> | void => useServerHead({ title })

export const useServerTagBase = (base: Base): ActiveHeadEntry<any> | void => useServerHead({ base })

export const useServerTagMeta = (meta: Arrayable<Meta>): ActiveHeadEntry<any> | void => useServerHead({ meta: asArray(meta) })

export const useServerTagMetaFlat = (meta: MetaFlatInput): ActiveHeadEntry<any> | void => useServerTagMeta(unpackMeta(meta))

export const useServerTagLink = (link: Arrayable<Link>): ActiveHeadEntry<any> | void => useServerHead({ link: asArray(link) })

export const useServerTagScript = (script: Arrayable<Script>): ActiveHeadEntry<any> | void => useServerHead({ script: asArray(script) })

export const useServerTagStyle = (style: Arrayable<Style>): ActiveHeadEntry<any> | void => useServerHead({ style: asArray(style) })

export const useServerTagNoscript = (noscript: Arrayable<Noscript>): ActiveHeadEntry<any> | void => useServerHead({ noscript: asArray(noscript) })

export const useServerHtmlAttrs = (attrs: HtmlAttributes): ActiveHeadEntry<any> | void => useServerHead({ htmlAttrs: attrs })

export const useServerBodyAttrs = (attrs: BodyAttributes): ActiveHeadEntry<any> | void => useServerHead({ bodyAttrs: attrs })

export const useServerTitleTemplate = (titleTemplate: TitleTemplate): ActiveHeadEntry<any> | void => useServerHead({ titleTemplate })
