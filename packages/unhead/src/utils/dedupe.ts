import type { HeadTag } from '../types'
import { MetaTagsArrayable, TagsWithInnerContent, UniqueTags } from './const'

const META_NOREWRITE_RE = /^(?:viewport|description|keywords|robots)$/
const META_KEY_ATTRS = ['name', 'property', 'http-equiv'] as const

export function isMetaArrayDupeKey(v: string) {
  const i = v.indexOf(':')
  if (i === -1)
    return false
  const j = v.indexOf(':', i + 1)
  return MetaTagsArrayable.has(v.slice(i + 1, j === -1 ? v.length : j))
}

export function dedupeKey<T extends HeadTag>(tag: T): string | undefined {
  const { props, tag: t, key } = tag
  if (UniqueTags.has(t))
    return t
  // semantic link singletons; must win over an explicit `key`
  if (t === 'link') {
    if (props.rel === 'canonical')
      return 'canonical'
    if (props.rel === 'alternate') {
      if (props.hreflang)
        return `alternate:${props.hreflang}`
      if (props.type)
        return `alternate:${props.type}:${props.href || ''}`
    }
  }
  if (props.charset)
    return 'charset'
  if (t === 'meta') {
    for (const n of META_KEY_ATTRS) {
      const v = props[n]
      if (v !== undefined)
        return `meta:${v}${(typeof v !== 'string' || !v.includes(':')) && !META_NOREWRITE_RE.test(v) && key ? `:key:${key}` : ''}`
    }
  }
  if (key)
    return `${t}:key:${key}`
  if (props.id)
    return `${t}:id:${props.id}`
  // after key/id so an explicit key still allows multiple links with the same rel + href
  if (t === 'link' && props.rel && props.href)
    return `link:${props.rel}:${props.href}`
  return TagsWithInnerContent.has(t) && (tag.textContent || tag.innerHTML) ? `${t}:content:${tag.textContent || tag.innerHTML}` : undefined
}

export function hashTag(tag: HeadTag) {
  const identity = tag._h || tag._d || tag.textContent || tag.innerHTML
  if (identity)
    return identity
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
