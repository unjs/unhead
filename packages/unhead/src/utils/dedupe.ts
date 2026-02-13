import type { HeadTag } from '../types'
import { MetaTagsArrayable, TagsWithInnerContent, UniqueTags } from './const'

const allowedMetaProperties = ['name', 'property', 'http-equiv']

// Standard single-value meta tags that should always deduplicate
// Tags not included here can be duped by using content: ['one', 'two']
const StandardSingleMetaTags = new Set([
  'viewport',
  'description',
  'keywords',
  'robots',
])

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

  // dedupe alternate links with hreflang/type by that attribute
  if (name === 'link' && props.rel === 'alternate') {
    const altKey = props.hreflang || props.type
    if (altKey) {
      return `alternate:${altKey}`
    }
  }

  if (props.charset)
    return 'charset'

  if (tag.tag === 'meta') {
    for (const n of allowedMetaProperties) {
      // open graph props can have multiple tags with the same property
      if (props[n] !== undefined) {
        const propValue = props[n]
        const isStructured = propValue && typeof propValue === 'string' && propValue.includes(':')
        const isStandardSingle = propValue && StandardSingleMetaTags.has(propValue)
        const shouldAlwaysDedupe = isStructured || isStandardSingle
        const keyPart = (!shouldAlwaysDedupe && tag.key) ? `:key:${tag.key}` : ''
        return `${name}:${propValue}${keyPart}`
      }
    }
  }

  if (tag.key) {
    return `${name}:key:${tag.key}`
  }

  if (props.id) {
    return `${name}:id:${props.id}`
  }

  // bare alternate links (no hreflang/type/key/id) dedupe by href
  if (name === 'link' && props.rel === 'alternate') {
    return `alternate:${props.href || ''}`
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
