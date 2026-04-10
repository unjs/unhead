import type { HeadTag } from '../types'
import { MetaTagsArrayable, TagsWithInnerContent, UniqueTags } from './const'

const META_NOREWRITE_RE = /^(?:viewport|description|keywords|robots)$/

export function isMetaArrayDupeKey(v: string) {
  return MetaTagsArrayable.has(v.split(':')[1])
}

export function dedupeKey<T extends HeadTag>(tag: T): string | undefined {
  const { props, tag: t, key } = tag
  if (UniqueTags.has(t))
    return t
  if (t === 'link' && props.rel === 'canonical')
    return 'canonical'
  if (t === 'link' && props.rel === 'alternate') {
    const altKey = props.hreflang || props.type
    if (altKey)
      return `alternate:${altKey}`
  }
  // importmap is unique per document per HTML spec
  if (t === 'script' && props.type === 'importmap')
    return 'script:importmap'

  if (props.charset)
    return 'charset'
  if (t === 'meta') {
    for (const n of ['name', 'property', 'http-equiv']) {
      const v = props[n]
      if (v !== undefined)
        return `meta:${v}${(typeof v !== 'string' || !v.includes(':')) && !META_NOREWRITE_RE.test(v) && key ? `:key:${key}` : ''}`
    }
  }
  if (key)
    return `${t}:key:${key}`
  if (props.id)
    return `${t}:id:${props.id}`
  if (t === 'link' && props.rel === 'alternate')
    return `alternate:${props.href || ''}`
  return TagsWithInnerContent.has(t) && (tag.textContent || tag.innerHTML) ? `${t}:content:${tag.textContent || tag.innerHTML}` : undefined
}

export function hashTag(tag: HeadTag) {
  return tag._h || tag._d || tag.textContent || tag.innerHTML
    || `${tag.tag}:${Object.entries(tag.props).map(([k, v]) => `${k}:${String(v)}`).join()}`
}
