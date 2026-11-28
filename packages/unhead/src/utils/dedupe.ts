import type { HeadTagInput } from '../types'
import { TagsWithInnerContent, UniqueTags } from './const'

const META_NOREWRITE_RE = /^(?:viewport|description|keywords|robots)$/
const META_ARRAYABLE_RE = /^(?:(?:theme-color|google-site-verification|author|og:locale:alternate|(?:article|book):(?:author|tag))$|(?:og:(?:image|video|audio)|twitter:image)(?::|$))/

export function isMetaArrayDupeKey(v: string) {
  const i = v.indexOf(':')
  return i !== -1 && META_ARRAYABLE_RE.test(v.slice(i + 1))
}

export function dedupeKey<T extends HeadTagInput>(tag: T, skipContent?: boolean): string | undefined {
  const { tag: t, key } = tag
  const attrs = tag.attrs ?? tag.props!
  if (UniqueTags.has(t))
    return t
  // semantic link singletons; must win over an explicit `key`
  if (t === 'link') {
    if (attrs.rel === 'canonical')
      return 'canonical'
    if (attrs.rel === 'alternate' && attrs.hreflang)
      return `alternate:${attrs.hreflang}`
  }
  if (attrs.charset)
    return 'charset'
  if (t === 'meta') {
    const v = attrs.name !== undefined ? attrs.name : attrs.property !== undefined ? attrs.property : attrs['http-equiv']
    if (v !== undefined)
      return key && (typeof v !== 'string' || !v.includes(':')) && !META_NOREWRITE_RE.test(v) ? `meta:${v}:key:${key}` : `meta:${v}`
  }
  if (key)
    return `${t}:key:${key}`
  if (attrs.id)
    return `${t}:id:${attrs.id}`
  // after key/id so an explicit key still allows multiple links with the same rel + href
  if (t === 'link' && attrs.rel && attrs.href)
    return `link:${attrs.rel}:${attrs.href}`
  return !skipContent && TagsWithInnerContent.has(t) && (tag.textContent || tag.innerHTML) ? `${t}:content:${tag.textContent || tag.innerHTML}` : undefined
}

export function hashTag<T extends HeadTagInput>(tag: T): string {
  const identity = tag._h || tag._d || tag.textContent || tag.innerHTML
  // stringify: a number/boolean textContent is not a valid string key (#1006)
  if (identity)
    return String(identity)
  // sort so the hash is stable across differing prop insertion orders (#823)
  const attrs = tag.attrs ?? tag.props!
  const keys = Object.keys(attrs).sort()
  let hash = `${tag.tag}:`
  let separator = ''
  for (const key of keys) {
    hash += `${separator}${key}:${String(attrs[key])}`
    separator = ','
  }
  return hash
}
