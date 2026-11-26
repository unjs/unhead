import type { HeadTag } from '../types'
import { TagsWithInnerContent, UniqueTags } from './const'

const META_NOREWRITE_RE = /^(?:viewport|description|keywords|robots)$/
const META_ARRAYABLE_RE = /^(?:(?:theme-color|google-site-verification|author|og:locale:alternate|(?:article|book):(?:author|tag))$|(?:og:(?:image|video|audio)|twitter:image)(?::|$))/

export function isMetaArrayDupeKey(v: string) {
  const i = v.indexOf(':')
  return i !== -1 && META_ARRAYABLE_RE.test(v.slice(i + 1))
}

export function dedupeKey<T extends HeadTag>(tag: T, skipContent?: boolean): string | undefined {
  const { props, tag: t, key } = tag
  if (UniqueTags.has(t))
    return t
  // semantic link singletons; must win over an explicit `key`
  if (t === 'link') {
    if (props.rel === 'canonical')
      return 'canonical'
    if (props.rel === 'alternate' && props.hreflang)
      return `alternate:${props.hreflang}`
  }
  if (props.charset)
    return 'charset'
  if (t === 'meta') {
    const v = props.name !== undefined ? props.name : props.property !== undefined ? props.property : props['http-equiv']
    if (v !== undefined)
      return key && (typeof v !== 'string' || !v.includes(':')) && !META_NOREWRITE_RE.test(v) ? `meta:${v}:key:${key}` : `meta:${v}`
  }
  if (key)
    return `${t}:key:${key}`
  if (props.id)
    return `${t}:id:${props.id}`
  // after key/id so an explicit key still allows multiple links with the same rel + href
  if (t === 'link' && props.rel && props.href)
    return `link:${props.rel}:${props.href}`
  return !skipContent && TagsWithInnerContent.has(t) && (tag.textContent || tag.innerHTML) ? `${t}:content:${tag.textContent || tag.innerHTML}` : undefined
}

export function hashTag(tag: HeadTag): string {
  const identity = tag._h || tag._d || tag.textContent || tag.innerHTML
  // stringify: a number/boolean textContent is not a valid string key (#1006)
  if (identity)
    return String(identity)
  // sort so the hash is stable across differing prop insertion orders (#823)
  const keys = Object.keys(tag.props).sort()
  let hash = `${tag.tag}:`
  let separator = ''
  for (const key of keys) {
    hash += `${separator}${key}:${String(tag.props[key])}`
    separator = ','
  }
  return hash
}
