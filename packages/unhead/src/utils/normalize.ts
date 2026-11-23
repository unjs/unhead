import type { ResolvedHeadTag as HeadTag, HeadTagInput, PropResolver, ResolvableHead } from '../types'
import { walkResolver } from '../utils/walkResolver'
import { INVALID_ATTR_NAME_RE } from './attrs'
import { DupeableTags, HasElementTags, isJsonScriptType, TagConfigKeys } from './const'
import { isUnsafeKey } from './unsafeKey'

const ASCII_UPPER_RE = /[A-Z]/g
const NON_LOWERCASE_ATTR_RE = /[^a-z0-9_:.@-]/
export const CLASS_SEPARATOR_RE = /[\t\n\f\r ]+/

function normalizeStyleClassProps(
  key: 'class' | 'style',
  value: unknown,
): Map<string, string> | Set<string> {
  const isStyle = key === 'style'
  const store: any = isStyle ? new Map() : new Set()
  const add = (item: unknown) => {
    if (typeof item === 'string') {
      if (isStyle) {
        const colon = item.indexOf(':')
        if (colon > 0)
          store.set(item.slice(0, colon).trim(), item.slice(colon + 1).trim())
      }
      else {
        item.split(CLASS_SEPARATOR_RE).forEach(name => name && store.add(name))
      }
    }
    else if (Array.isArray(item)) {
      item.forEach(add)
    }
    else if (item && typeof item === 'object') {
      for (const name in item) {
        const value = (item as Record<string, unknown>)[name]
        if (value !== 'false' && (value || (isStyle && value === 0)))
          isStyle ? store.set(name.trim(), String(value)) : add(name)
      }
    }
  }
  add(isStyle && typeof value === 'string' ? value.split(';') : value)
  return store
}

export function normalizeProps(inputTag: HeadTagInput, input: Record<string, any>): HeadTag {
  // attrs is the canonical field; props is a deprecated alias for the same object
  const attrs = inputTag.attrs || inputTag.props || {}
  const tag = Object.assign(inputTag, { attrs, props: attrs })
  if (!input)
    return tag
  if (tag.tag === 'templateParams') {
    tag.attrs = tag.props = input
    return tag
  }
  const isHtmlTag = HasElementTags.has(tag.tag) || tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs'

  for (const prop in input) {
    if (isUnsafeKey(prop))
      continue
    const isData = prop.startsWith('data-')
    const isHtmlAttr = isHtmlTag && !TagConfigKeys.has(prop)
    let key = prop
    if (isHtmlAttr && (!prop || NON_LOWERCASE_ATTR_RE.test(prop))) {
      if (!isData)
        key = prop.replace(ASCII_UPPER_RE, letter => letter.toLowerCase())
      if (!key || INVALID_ATTR_NAME_RE.test(key))
        continue
    }
    const value = input[prop]
    if (value === null) {
      tag.attrs[key] = null as any
    }
    else if (prop === 'class' || prop === 'style') {
      tag.attrs[prop] = normalizeStyleClassProps(prop, value) as any
    }
    else if (TagConfigKeys.has(prop)) {
      if ((prop === 'textContent' || prop === 'innerHTML') && typeof value === 'object') {
        const type = input.type || 'application/json'
        if (isJsonScriptType(type)) {
          tag.attrs.type = type
          tag[prop] = JSON.stringify(value)
        }
      }
      else {
        (tag as any)[prop] = value
      }
    }
    else if (value !== undefined) {
      // Normalize camelCase HTML attributes to lowercase (e.g. hrefLang -> hreflang)
      // Only for real HTML element tags, not internal virtual tags like _flatMeta
      const str = String(value)
      const preserveString = isData || (tag.tag === 'meta' && key === 'content') || (tag.tag === 'script' && typeof value === 'string' && (key === 'type' || key === 'language'))
      tag.attrs[key] = str === 'true' || str === '' ? (preserveString ? str : true) : !value && isData && str === 'false' ? 'false' : value
    }
  }
  return tag
}

export function resolveHeadInput(input: any, propResolvers: PropResolver[]): any {
  let resolve: PropResolver | undefined
  if (propResolvers.length) {
    resolve = (key, val) => {
      for (let i = 0; i < propResolvers.length; i++)
        val = propResolvers[i](key, val)
      return val
    }
    // Resolve the root before walking so ref-wrapped functions are unwrapped.
    input = resolve(undefined, input)
  }
  return walkResolver(input, resolve)
}

// pushes onto `tags`: an array `content` expands to one tag per value
function normalizeTag(tags: HeadTag[], tagName: HeadTag['tag'], _input: HeadTag['attrs'] | string) {
  const input = typeof _input === 'object'
    ? _input
    : { [(tagName === 'script' || tagName === 'noscript' || tagName === 'style') ? 'innerHTML' : 'textContent']: _input }
  // normalizeProps already stringifies an object `innerHTML` of a JSON script and drops any other
  const tag = normalizeProps({ tag: tagName, attrs: {} }, input)
  if (tag.key && DupeableTags.has(tag.tag))
    tag.attrs['data-hid'] = tag._h = tag.key
  if (Array.isArray(tag.attrs.content)) {
    for (const content of tag.attrs.content) {
      const attrs = { ...tag.attrs, content }
      tags.push({ ...tag, attrs, props: attrs })
    }
  }
  else {
    tags.push(tag)
  }
}

export function normalizeEntryToTags(input: any, propResolvers: PropResolver[]): HeadTag[] {
  if (!input)
    return []
  if (typeof input === 'function')
    input = input()
  // The root intentionally passes through the resolver chain twice. The first
  // pass unwraps refs, then walkResolver invokes a function returned by a ref.
  input = resolveHeadInput(input, propResolvers)
  const tags: HeadTag[] = []
  for (const key in input) {
    const value = input[key]
    if (value !== undefined) {
      if (Array.isArray(value)) {
        for (const v of value) normalizeTag(tags, key as keyof ResolvableHead, v)
      }
      else {
        normalizeTag(tags, key as keyof ResolvableHead, value)
      }
    }
  }
  return tags
}
