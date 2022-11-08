import type {
  Base,
  BodyAttributes,
  Head,
  HeadEntryOptions,
  HtmlAttributes,
  Link,
  Meta,
  Noscript,
  Script,
  Style,
} from '@unhead/schema'
import { IsClient } from '../env'
import { getActiveHead } from './state'

export function useHead<T extends Head>(input: T, options: HeadEntryOptions = {}) {
  if ((options.mode === 'server' && IsClient) || (options.mode === 'client' && !IsClient))
    return
  const head = getActiveHead()
  head.push(input, options)
}

export function useServerHead<T extends Head>(input: T, options: HeadEntryOptions = {}) {
  useHead(input, { ...options, mode: 'server' })
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
