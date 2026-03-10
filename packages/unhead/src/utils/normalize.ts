import type { HeadTag, PropResolver, ResolvableHead } from '../types'
import { walkResolver } from '../utils/walkResolver'
import { DupeableTags, HasElementTags, TagConfigKeys } from './const'

function normalizeStyleClassProps(
  key: 'class' | 'style',
  value: any,
): Map<string, string> | Set<string> {
  const store = key === 'style' ? new Map() : new Set()

  function processValue(rawValue: string) {
    if (rawValue == null || rawValue === undefined)
      return
    const value = String(rawValue).trim()
    if (!value)
      return

    if (key === 'style') {
      const [k, ...v] = value.split(':').map(s => s ? s.trim() : '')
      if (k && v.length)
        // @ts-expect-error untyped
        store.set(k, v.join(':'))
    }
    else {
      // @ts-expect-error untyped
      value.split(' ').filter(Boolean).forEach(c => store.add(c))
    }
  }

  if (typeof value === 'string') {
    key === 'style'
      ? value.split(';').forEach(processValue)
      : processValue(value)
  }
  else if (Array.isArray(value)) {
    value.forEach(item => processValue(item))
  }
  else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => {
      if (v && v !== 'false') {
        key === 'style'
          // @ts-expect-error untyped
          ? store.set(String(k).trim(), String(v))
          : processValue(k)
      }
    })
  }
  // @ts-expect-error untyped
  return store
}

export function normalizeProps(tag: HeadTag, input: Record<string, any>): HeadTag {
  tag.props = tag.props || {}
  if (!input) {
    return tag
  }
  if (tag.tag === 'templateParams') {
    tag.props = input
    return tag
  }

  const isHtmlTag = HasElementTags.has(tag.tag) || tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs'

  Object.entries(input).forEach(([prop, value]) => {
    if (prop === '__proto__' || prop === 'constructor' || prop === 'prototype')
      return
    // if the value is a primitive, return early
    if (value === null) {
      // @ts-expect-error untyped
      tag.props[prop] = null
      return
    }

    if (prop === 'class' || prop === 'style') {
      // @ts-expect-error untyped
      tag.props[prop] = normalizeStyleClassProps(prop as 'class' | 'style', value)
      return
    }

    if (TagConfigKeys.has(prop)) {
      if ((prop === 'textContent' || prop === 'innerHTML') && typeof value === 'object') {
        let type = input.type
        if (!input.type) {
          type = 'application/json'
        }
        if (!type?.endsWith('json') && type !== 'speculationrules') {
          return
        }
        input.type = type
        tag.props.type = type
        tag[prop] = JSON.stringify(value)
      }
      else {
        // @ts-expect-error untyped
        tag[prop] = value
      }
      return
    }

    // Normalize camelCase HTML attributes to lowercase (e.g. hrefLang -> hreflang)
    // Only for real HTML element tags, not internal virtual tags like _flatMeta
    const isDataKey = prop.startsWith('data-')
    const key = isHtmlTag && !isDataKey ? prop.toLowerCase() : prop

    const strValue = String(value)
    const isMetaContentKey = tag.tag === 'meta' && key === 'content'

    if (strValue === 'true' || strValue === '') {
      // @ts-expect-error untyped
      tag.props[key] = (isDataKey || isMetaContentKey) ? strValue : true
    }
    else if (!value && isDataKey && strValue === 'false') {
      tag.props[key] = 'false'
    }
    else if (value !== undefined) {
      tag.props[key] = value
    }
  })

  return tag
}

function normalizeTag(tagName: HeadTag['tag'], _input: HeadTag['props'] | string): HeadTag | HeadTag[] {
  const input = (typeof _input === 'object' && typeof _input !== 'function')
    ? _input
    : { [(tagName === 'script' || tagName === 'noscript' || tagName === 'style') ? 'innerHTML' : 'textContent']: _input }

  const tag = normalizeProps({ tag: tagName, props: {} }, input)
  if (tag.key && DupeableTags.has(tag.tag)) {
    tag.props['data-hid'] = tag._h = tag.key
  }

  if (tag.tag === 'script' && typeof tag.innerHTML === 'object') {
    tag.innerHTML = JSON.stringify(tag.innerHTML)
    tag.props.type = tag.props.type || 'application/json'
  }

  return Array.isArray(tag.props.content)
    ? tag.props.content.map(v => ({ ...tag, props: { ...tag.props, content: v } }))
    : tag
}

export function normalizeEntryToTags(input: any, propResolvers: PropResolver[]): HeadTag[] {
  if (!input) {
    return []
  }
  if (typeof input === 'function') {
    input = input()
  }
  const resolvers = (key?: string, val?: any) => {
    for (let i = 0; i < propResolvers.length; i++) {
      val = propResolvers[i](key, val)
    }
    return val
  }
  input = resolvers(undefined, input)

  const tags: (HeadTag | HeadTag[])[] = []

  input = walkResolver(input, resolvers)
  Object.entries(input || {}).forEach(([key, value]) => {
    if (value === undefined)
      return
    for (const v of (Array.isArray(value) ? value : [value]))
      tags.push(normalizeTag(key as keyof ResolvableHead, v))
  })
  return tags.flat()
}
