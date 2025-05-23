import type { HeadTag } from '../types'
import { MetaTagsArrayable, TagsWithInnerContent, UniqueTags } from './const'

const allowedMetaProperties = ['name', 'property', 'http-equiv']

export function isMetaArrayDupeKey(v: string) {
  const parts = v.split(':')
  if (!parts.length)
    return false
  return MetaTagsArrayable.has(parts[1])
}

export function dedupeKey<T extends HeadTag>(tag: T): string | undefined {
  const { props, tag: name } = tag
  // must only be a single base so we always dedupe
  if (UniqueTags.has(name))
    return name

  // support only a single canonical
  if (name === 'link' && props.rel === 'canonical')
    return 'canonical'

  if (props.charset)
    return 'charset'

  if (tag.tag === 'meta') {
    for (const n of allowedMetaProperties) {
      // open graph props can have multiple tags with the same property
      if (props[n] !== undefined) {
        // const val = isMetaArrayDupeKey(props[n]) ? `:${props.content}` : ''
        // for example: meta-name-description
        return `${name}:${props[n]}`
      }
    }
  }

  if (tag.key) {
    return `${name}:key:${tag.key}`
  }

  if (props.id) {
    return `${name}:id:${props.id}`
  }

  // avoid duplicate tags with the same content (if no key is provided)
  if (TagsWithInnerContent.has(name)) {
    const v = tag.textContent || tag.innerHTML
    if (v) {
      return `${name}:content:${v}`
    }
  }
}

export function hashTag(tag: HeadTag) {
  const dedupe = tag._h || tag._d
  if (dedupe)
    return dedupe
  const inner = tag.textContent || tag.innerHTML
  if (inner)
    return inner
  return `${tag.tag}:${Object.entries(tag.props).map(([k, v]) => `${k}:${String(v)}`).join(',')}`
}
