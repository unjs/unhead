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
  useHead(input, { ...options, mode: 'server' })
}

export const useServerTagTitle = (title: Title) => {
  useServerHead({ title })
}

export const useServerTagBase = (base: Base) => {
  useServerHead({ base })
}

export const useServerTagMeta = (meta: Arrayable<Meta>) => {
  useServerHead({ meta: asArray(meta) })
}

export const useServerTagMetaFlat = (meta: MetaFlatInput) => {
  useServerTagMeta(unpackMeta(meta))
}

export const useServerTagLink = (link: Arrayable<Link>) => {
  useServerHead({ link: asArray(link) })
}

export const useServerTagScript = (script: Arrayable<Script>) => {
  useServerHead({ script: asArray(script) })
}

export const useServerTagStyle = (style: Arrayable<Style>) => {
  useServerHead({ style: asArray(style) })
}

export const useServerTagNoscript = (noscript: Arrayable<Noscript>) => {
  useServerHead({ noscript: asArray(noscript) })
}

export const useServerHtmlAttrs = (attrs: HtmlAttributes) => {
  useServerHead({ htmlAttrs: attrs })
}

export const useServerBodyAttrs = (attrs: BodyAttributes) => {
  useServerHead({ bodyAttrs: attrs })
}

export const useServerTitleTemplate = (titleTemplate: TitleTemplate) => {
  useServerHead({ titleTemplate })
}
