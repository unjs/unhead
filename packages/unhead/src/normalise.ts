import type { Head, HeadTag, HeadTagKeys } from '@unhead/schema'
import { ValidHeadTags, normaliseProps } from 'zhead'
import type { HeadEntry } from './types'
import { asArray } from './util'

export function normaliseTag<T>(tagName: HeadTag['tag'], input: HeadTag['props'], entry: HeadEntry<T>): HeadTag | HeadTag[] {
  const tag: HeadTag = { tag: tagName, _e: entry._i, props: {} }

  let props: HeadTag['props']
  if (tagName.startsWith('title')) {
    // title is a special case, we need to normalise it
    // to a string
    props = { children: String(input) }
  }
  else {
    // clone the input so we're not modifying source
    props = { ...input }
  }
  // set children key
  (<HeadTagKeys> ['children', 'innerHTML', 'textContent'])
    .forEach((key) => {
      if (typeof props[key] !== 'undefined') {
        tag.children = props[key]
        delete props[key]
      }
    })

  // clear user tag options from the tag props (tagPosition, tagPriority, etc)
  for (const k in props) {
    if (k.startsWith('tag')) {
      // @ts-expect-error untyped
      tag[k] = props[k]
      delete props[k]
    }
  }

  // handle boolean props
  tag.props = normaliseProps(props)

  // allow meta to be resolved into multiple tags if an array is provided on content
  if (tag.props.content && Array.isArray(tag.props.content)) {
    return tag.props.content.map((v) => {
      const newTag = { ...tag, props: { ...tag.props } }
      newTag.props.content = v
      return newTag
    })
  }
  return tag
}

export function normaliseEntryTags<T extends {} = Head>(e: HeadEntry<T>) {
  return Object.entries(e.input)
    .filter(([k, v]) => typeof v !== 'undefined' && ValidHeadTags.includes(k))
    .map(([k, value]) => asArray(value)
      // @ts-expect-error untyped
      .map(props => asArray(normaliseTag(k as HeadTag['tag'], props, e))),
    )
    .flat(3)
    .map((t, i) => {
      // used to restore the order after deduping
      // a large number is needed otherwise the position will potentially duplicate (this support 10k tags)
      // ideally we'd use the total tag count but this is too hard to calculate with the current reactivity
      // << 8 is 256 tags per entry
      t._p = (e._i << 8) + (i++)
      return t
    })
}
