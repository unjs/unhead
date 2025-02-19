import type { SafeBodyAttr, SafeHtmlAttr, SafeLink, SafeMeta, SafeNoscript, SafeScript } from 'unhead/types'
import type { ReactiveHead } from './schema'
import type { MaybeSignal, ResolvableArray } from './util'

export interface HeadSafe extends Pick<ReactiveHead, 'title' | 'titleTemplate' | 'templateParams'> {
  meta?: ResolvableArray<SafeMeta>[]
  link?: ResolvableArray<SafeLink>[]
  noscript?: ResolvableArray<SafeNoscript>[]
  script?: ResolvableArray<SafeScript>[]
  htmlAttrs?: ResolvableArray<SafeHtmlAttr>
  bodyAttrs?: ResolvableArray<SafeBodyAttr>
}

export type UseHeadSafeInput = MaybeSignal<HeadSafe>
