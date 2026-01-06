import type { HeadTag } from '../types'
import { MetaTagsArrayable, TagsWithInnerContent, UniqueTags } from './const'

// Standard single-value meta tags that should always deduplicate
const StandardSingleMetaTags = new Set(['viewport', 'description', 'keywords', 'robots'])

export function isMetaArrayDupeKey(v: string) {
  return MetaTagsArrayable.has(v.split(':')[1])
}

export function dedupeKey<T extends HeadTag>(tag: T): string | undefined {
  const { props, tag: name, key } = tag
  if (UniqueTags.has(name))
    return name
  if (name === 'link' && props.rel === 'canonical')
    return 'canonical'
  if (props.charset)
    return 'charset'
  if (name === 'meta') {
    for (const n of ['name', 'property', 'http-equiv']) {
      const v = props[n]
      if (v !== undefined) {
        const dedupe = (typeof v === 'string' && v.includes(':')) || StandardSingleMetaTags.has(v)
        return `meta:${v}${!dedupe && key ? `:key:${key}` : ''}`
      }
    }
  }
  if (key)
    return `${name}:key:${key}`
  if (props.id)
    return `${name}:id:${props.id}`
  if (TagsWithInnerContent.has(name)) {
    const v = tag.textContent || tag.innerHTML
    if (v)
      return `${name}:content:${v}`
  }
}

export function hashTag(tag: HeadTag) {
  return tag._h || tag._d || tag.textContent || tag.innerHTML
    || `${tag.tag}:${Object.entries(tag.props).map(([k, v]) => `${k}:${v}`).join()}`
}
