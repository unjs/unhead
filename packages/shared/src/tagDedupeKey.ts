import type { HeadTag } from '@unhead/schema'
import { UniqueTags } from '.'

export function tagDedupeKey<T extends HeadTag>(tag: T, fn?: (key: string) => boolean): string | false {
  const { props, tag: tagName } = tag
  // must only be a single base so we always dedupe
  if (UniqueTags.has(tagName))
    return tagName

  // support only a single canonical
  if (tagName === 'link' && props.rel === 'canonical')
    return 'canonical'

  // must only be a single charset
  if (props.charset)
    return 'charset'

  const name = ['id']
  if (tagName === 'meta')
    name.push(...['name', 'property', 'http-equiv'])
  for (const n of name) {
    // open graph props can have multiple tags with the same property
    if (typeof props[n] !== 'undefined') {
      const val = String(props[n])
      if (fn && !fn(val))
        return false
      // for example: meta-name-description
      return `${tagName}:${n}:${val}`
    }
  }
  return false
}
