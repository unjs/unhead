import type { HeadTag } from '../types'
import { MetaTagsArrayable, TagsWithInnerContent, UniqueTags } from './const'

export function isMetaArrayDupeKey(v: string) {
  return MetaTagsArrayable.has(v.split(':')[1])
}

export function dedupeKey<T extends HeadTag>(tag: T): string | undefined {
  const { props, tag: t, key } = tag
  if (UniqueTags.has(t))
    return t
  if (t === 'link' && props.rel === 'canonical')
    return 'canonical'
  if (t === 'link' && props.rel === 'alternate')
    return `alternate:${props.hreflang || props.type || 'x-default'}:${props.href || ''}`

  if (props.charset)
    return 'charset'
  if (t === 'meta') {
    for (const n of ['name', 'property', 'http-equiv']) {
      const v = props[n]
      if (v !== undefined)
        return `meta:${v}${(typeof v !== 'string' || !v.includes(':')) && !/^(?:viewport|description|keywords|robots)$/.test(v) && key ? `:key:${key}` : ''}`
    }
  }
  return key
    ? `${t}:key:${key}`
    : props.id
      ? `${t}:id:${props.id}`
      : TagsWithInnerContent.has(t) && (tag.textContent || tag.innerHTML) ? `${t}:content:${tag.textContent || tag.innerHTML}` : undefined
}

export function hashTag(tag: HeadTag) {
  return tag._h || tag._d || tag.textContent || tag.innerHTML
    || `${tag.tag}:${Object.entries(tag.props).map(([k, v]) => `${k}:${v}`).join()}`
}
