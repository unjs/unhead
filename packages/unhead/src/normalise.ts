import type { Head, HeadTag } from '@unhead/schema'
import { ValidHeadTags, normaliseTag as normaliseTagBase } from 'zhead'
import type { HeadEntry } from './types'
import { TagConfigKeys, asArray } from './util'

export function normaliseTag<T>(tagName: HeadTag['tag'], input: HeadTag['props'], entry: HeadEntry<T>): HeadTag | HeadTag[] {
  const tag = normaliseTagBase(tagName, input, { childrenKeys: ['innerHTML', 'textContent'] }) as HeadTag
  tag._e = entry._i

  // keys with direct mapping
  Object.keys(tag.props)
    .filter(k => TagConfigKeys.includes(k))
    .forEach((k) => {
      // @ts-expect-error untyped
      tag[k] = tag.props[k]
      delete tag.props[k]
    })
  // class object boolean support
  if (typeof tag.props.class === 'object' && !Array.isArray(tag.props.class)) {
    tag.props.class = Object.keys(tag.props.class)
      .filter(k => tag.props.class[k])
  }
  // class array support
  if (Array.isArray(tag.props.class))
    tag.props.class = tag.props.class.join(' ')

  // allow meta to be resolved into multiple tags if an array is provided on content
  if (tag.props.content && Array.isArray(tag.props.content)) {
    return tag.props.content.map((v, i) => {
      const newTag = { ...tag, props: { ...tag.props } }
      newTag.props.content = v
      newTag.key = `${tag.props.name || tag.props.property}:${i}`
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
      // support 256 tags per entry
      t._p = (e._i << 8) + (i++)
      return t
    })
}
