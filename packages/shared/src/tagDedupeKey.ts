import type { HeadTag } from '@unhead/schema'
import { UniqueTags } from './constants'

const allowedMetaProperties = ['name', 'property', 'http-equiv']

export function tagDedupeKey<T extends HeadTag>(tag: T): string | false {
  const { props, tag: tagName } = tag
  // must only be a single base so we always dedupe
  if (UniqueTags.has(tagName))
    return tagName

  // support only a single canonical
  if (tagName === 'link' && props.rel === 'canonical')
    return 'canonical'

  if (props.charset)
    return 'charset'

  if (props.id) {
    return `${tagName}:id:${props.id}`
  }

  for (const n of allowedMetaProperties) {
    // open graph props can have multiple tags with the same property
    if (props[n] !== undefined) {
      // for example: meta-name-description
      return `${tagName}:${n}:${props[n]}`
    }
  }
  return false
}
