import type { Base, BodyAttributes, HtmlAttributes, Link, Meta, Noscript, Script, Style } from '@unhead/schema'
import type { HeadEntryOptions } from './types'
import { getActiveHead } from './state'

export function useHead<T>(input: T, options: HeadEntryOptions = {}) {
  const head = getActiveHead<T>()
  head.push(input, options)
}

export const useTitle = (title: string) => {
  useHead({ title })
}

export const useMeta = (meta: Meta) => {
  useHead({ meta: [meta] })
}

export const useLink = (link: Link) => {
  useHead({ link: [link] })
}

export const useScript = (script: Script) => {
  useHead({ script: [script] })
}

export const useStyle = (style: Style) => {
  useHead({ style: [style] })
}

export const useBase = (base: Base) => {
  useHead({ base })
}

export const useHtmlAttrs = (attrs: HtmlAttributes) => {
  useHead({ htmlAttrs: attrs })
}

export const useBodyAttrs = (attrs: BodyAttributes) => {
  useHead({ bodyAttrs: attrs })
}

export const useTitleTemplate = (titleTemplate: string) => {
  useHead({ titleTemplate })
}

export const useNoscript = (noscript: Noscript) => {
  useHead({ noscript: [noscript] })
}
