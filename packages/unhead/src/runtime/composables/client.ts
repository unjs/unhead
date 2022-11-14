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
import { IsBrowser } from '../../env'
import { getActiveHead } from '../state'

export function useHead<T extends Head>(input: T, options: HeadEntryOptions = {}): ActiveHeadEntry<T> | void {
  const head = getActiveHead()
  if (head) {
    const isBrowser = IsBrowser || head.resolvedOptions?.document
    if ((options.mode === 'server' && isBrowser) || (options.mode === 'client' && !isBrowser))
      return
    return head.push(input, options)
  }
}

export const useTagTitle = (title: Title): ActiveHeadEntry<any> | void => useHead({ title })

export const useTagBase = (base: Base): ActiveHeadEntry<any> | void => useHead({ base })

export const useTagMeta = (meta: Arrayable<Meta>): ActiveHeadEntry<any> | void => useHead({ meta: asArray(meta) })

export const useTagMetaFlat = (meta: MetaFlatInput): ActiveHeadEntry<any> | void => useTagMeta(unpackMeta(meta))

export const useSeoMeta = useTagMetaFlat

export const useTagLink = (link: Arrayable<Link>): ActiveHeadEntry<any> | void => useHead({ link: asArray(link) })

export const useTagScript = (script: Arrayable<Script>): ActiveHeadEntry<any> | void => useHead({ script: asArray(script) })

export const useTagStyle = (style: Arrayable<Style>): ActiveHeadEntry<any> | void => useHead({ style: asArray(style) })

export const useTagNoscript = (noscript: Arrayable<Noscript>): ActiveHeadEntry<any> | void => useHead({ noscript: asArray(noscript) })

export const useHtmlAttrs = (attrs: HtmlAttributes): ActiveHeadEntry<any> | void => useHead({ htmlAttrs: attrs })

export const useBodyAttrs = (attrs: BodyAttributes): ActiveHeadEntry<any> | void => useHead({ bodyAttrs: attrs })

export const useTitleTemplate = (titleTemplate: TitleTemplate): ActiveHeadEntry<any> | void => useHead({ titleTemplate })
