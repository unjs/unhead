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
import { IsClient } from '../../env'
import { getActiveHead } from '../state'

export function useHead<T extends Head>(input: T, options: HeadEntryOptions = {}): ActiveHeadEntry<T> | void {
  if ((options.mode === 'server' && IsClient) || (options.mode === 'client' && !IsClient))
    return
  const head = getActiveHead()
  head.push(input, options)
}

export const useTagTitle = (title: Title) => {
  useHead({ title })
}

export const useTagBase = (base: Base) => {
  useHead({ base })
}

export const useTagMeta = (meta: Arrayable<Meta>) => {
  useHead({ meta: asArray(meta) })
}

export const useTagMetaFlat = (meta: MetaFlatInput) => {
  useTagMeta(unpackMeta(meta))
}

export const useTagLink = (link: Arrayable<Link>) => {
  useHead({ link: asArray(link) })
}

export const useTagScript = (script: Arrayable<Script>) => {
  useHead({ script: asArray(script) })
}

export const useTagStyle = (style: Arrayable<Style>) => {
  useHead({ style: asArray(style) })
}

export const useTagNoscript = (noscript: Arrayable<Noscript>) => {
  useHead({ noscript: asArray(noscript) })
}

export const useHtmlAttrs = (attrs: HtmlAttributes) => {
  useHead({ htmlAttrs: attrs })
}

export const useBodyAttrs = (attrs: BodyAttributes) => {
  useHead({ bodyAttrs: attrs })
}

export const useTitleTemplate = (titleTemplate: TitleTemplate) => {
  useHead({ titleTemplate })
}
