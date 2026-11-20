import type { HtmlTagDescriptor } from 'vite'
import type { SerializableHead } from '../types'
import { HasElementTags, SelfClosingTags, TagConfigKeys } from '../utils/const'
import { normalizeProps } from '../utils/normalize'
import { isUnsafeKey } from '../utils/unsafeKey'

export type { HtmlTagDescriptor }

type DescriptorTag = 'base' | 'link' | 'meta' | 'noscript' | 'script' | 'style'
type HeadInput = Partial<Record<Exclude<DescriptorTag, 'base'>, TagInput[]>> & { base?: TagInput }
type TagInput = Record<string, string | boolean>

const ATTRIBUTE_NAME_RE = /^[a-z_][\w.:-]*$/i
const CHARACTER_REFERENCE_RE = /&(?:#|[a-z][a-z\d]*(?:;|(?=[^a-z\d=]|$)))/i

function unsupported(tag: string, reason: string): never {
  throw new TypeError(`[unhead/vite] Cannot convert <${tag}> with ${reason}. Use the framework HTML transform.`)
}

function convertTag(tag: DescriptorTag, descriptor: HtmlTagDescriptor): TagInput {
  const input: TagInput = {}
  for (const [name, value] of Object.entries(descriptor.attrs || {})) {
    if (value === false || value === undefined)
      continue

    const key = name.toLowerCase()
    if (!ATTRIBUTE_NAME_RE.test(name) || isUnsafeKey(key) || key === '_resolver' || key === 'data-hid'
      || TagConfigKeys.has(name) || TagConfigKeys.has(key) || Object.hasOwn(input, key)
      || (typeof value === 'string' && (CHARACTER_REFERENCE_RE.test(value) || value.includes('\r') || value.includes('\0')))) {
      unsupported(tag, `attribute "${name}"`)
    }
    input[key] = value === true ? '' : value
  }

  const { props } = normalizeProps({ tag, props: {} }, input)
  for (const [name, value] of Object.entries(input)) {
    if (props[name] !== value && !(value === '' && props[name] === true))
      unsupported(tag, `attribute "${name}"`)
  }
  if (tag === 'meta' && !props.content && !props.charset && !props['http-equiv'])
    unsupported(tag, 'empty or missing meta content')

  if (!SelfClosingTags.has(tag)) {
    if (typeof descriptor.children === 'string')
      input.innerHTML = descriptor.children
    else if (descriptor.children?.length)
      unsupported(tag, 'nested descriptors')
  }
  if (!Object.keys(props).length && !input.innerHTML)
    unsupported(tag, 'no attributes or content')

  input.processTemplateParams = false
  switch (descriptor.injectTo) {
    case 'body-prepend':
      input.tagPosition = 'bodyOpen'
      break
    case 'body':
      input.tagPosition = 'bodyClose'
      break
    case 'head':
      break
    default:
      input.tagPriority = 'high'
  }
  return input
}

/**
 * Converts flat Vite descriptors into input for Unhead's SSR renderer.
 * Throws when a descriptor needs the framework HTML transform.
 */
export function htmlTagsToHead(tags: readonly HtmlTagDescriptor[]): SerializableHead {
  const head: HeadInput = {}
  const base: TagInput[] = []
  for (const descriptor of tags) {
    if (!HasElementTags.has(descriptor.tag))
      unsupported(descriptor.tag, 'an unsupported tag name')

    const tag = descriptor.tag as DescriptorTag
    const input = convertTag(tag, descriptor)
    if (tag === 'base') {
      if (input.tagPosition)
        unsupported(tag, 'a body position')
      base.push(input)
    }
    else {
      (head[tag] ||= []).push(input)
    }
  }

  base.sort((a, b) => Number(b.tagPriority === 'high') - Number(a.tagPriority === 'high'))
  for (const input of base) {
    head.base ||= input
    for (const name of ['href', 'target']) {
      if (input[name] !== undefined)
        head.base[name] ??= input[name]
    }
  }
  return head as SerializableHead
}
