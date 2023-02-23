import type { SafeBodyAttr, SafeHtmlAttr, SafeLink, SafeMeta, SafeNoscript, SafeScript } from '@unhead/schema'
import type { MaybeComputedRef, MaybeComputedRefEntries } from './util'
import type { ReactiveHead } from './schema'

export interface HeadSafe extends Pick<ReactiveHead, 'title' | 'titleTemplate' | 'templateParams'> {
  meta?: MaybeComputedRefEntries<SafeMeta>[]
  link?: MaybeComputedRefEntries<SafeLink>[]
  noscript?: MaybeComputedRefEntries<SafeNoscript>[]
  script?: MaybeComputedRefEntries<SafeScript>[]
  htmlAttrs?: MaybeComputedRefEntries<SafeHtmlAttr>
  bodyAttrs?: MaybeComputedRefEntries<SafeBodyAttr>
}

export type UseHeadSafeInput = MaybeComputedRef<HeadSafe>
