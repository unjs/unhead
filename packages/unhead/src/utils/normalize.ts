import type { HeadTag, PropResolver, ResolvableHead } from '../types'
import { walkResolver } from '../utils/walkResolver'
import { DupeableTags, HasElementTags, TagConfigKeys } from './const'

function normalizeStyleClassProps(key: 'class' | 'style', value: any): Map<string, string> | Set<string> {
  const isStyle = key === 'style'
  const store: any = isStyle ? new Map() : new Set()
  const add = (v: string) => {
    if (!v)
      return
    if (isStyle) {
      const i = v.indexOf(':')
      i > 0 && store.set(v.slice(0, i).trim(), v.slice(i + 1).trim())
    }
    else {
      v.split(' ').forEach(c => c && store.add(c))
    }
  }
  if (typeof value === 'string') {
    (isStyle ? value.split(';') : [value]).forEach(add)
  }
  else if (Array.isArray(value)) {
    value.forEach(add)
  }
  else if (value && typeof value === 'object') {
    for (const k in value) {
      const v = value[k]
      v && v !== 'false' && (isStyle ? store.set(k.trim(), String(v)) : add(k))
    }
  }
  return store
}

export function normalizeProps(tag: HeadTag, input: Record<string, any>): HeadTag {
  tag.props = tag.props || {}
  if (!input)
    return tag
  if (tag.tag === 'templateParams') {
    tag.props = input
    return tag
  }
  const isHtmlTag = HasElementTags.has(tag.tag) || tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs'
  for (const prop in input) {
    if (prop === '__proto__' || prop === 'constructor' || prop === 'prototype')
      continue
    const value = input[prop]
    if (value === null) {
      tag.props[prop] = null as any
    }
    else if (prop === 'class' || prop === 'style') {
      tag.props[prop] = normalizeStyleClassProps(prop, value) as any
    }
    else if (TagConfigKeys.has(prop)) {
      if ((prop === 'textContent' || prop === 'innerHTML') && typeof value === 'object') {
        const type = input.type || 'application/json'
        if (type.endsWith('json') || type === 'speculationrules') {
          tag.props.type = input.type = type
          tag[prop] = JSON.stringify(value)
        }
      }
      else {
        (tag as any)[prop] = value
      }
    }
    else if (value !== undefined) {
      const isData = prop.startsWith('data-')
      const key = isHtmlTag && !isData ? prop.toLowerCase() : prop
      const str = String(value)
      const isMeta = tag.tag === 'meta' && key === 'content'
      tag.props[key] = str === 'true' || str === '' ? (isData || isMeta ? str : true) : !value && isData && str === 'false' ? 'false' : value
    }
  }
  return tag
}

function normalizeTag(tagName: HeadTag['tag'], _input: HeadTag['props'] | string): HeadTag | HeadTag[] {
  const input = typeof _input === 'object' && typeof _input !== 'function'
    ? _input
    : { [(tagName === 'script' || tagName === 'noscript' || tagName === 'style') ? 'innerHTML' : 'textContent']: _input }
  const tag = normalizeProps({ tag: tagName, props: {} }, input)
  if (tag.key && DupeableTags.has(tag.tag))
    tag.props['data-hid'] = tag._h = tag.key
  if (tag.tag === 'script' && typeof tag.innerHTML === 'object') {
    tag.innerHTML = JSON.stringify(tag.innerHTML)
    tag.props.type = tag.props.type || 'application/json'
  }
  return Array.isArray(tag.props.content) ? tag.props.content.map(v => ({ ...tag, props: { ...tag.props, content: v } })) : tag
}

export function normalizeEntryToTags(input: any, propResolvers: PropResolver[]): HeadTag[] {
  if (!input)
    return []
  if (typeof input === 'function')
    input = input()
  const resolvers = (key?: string, val?: any) => {
    for (const r of propResolvers)
      val = r(key, val)
    return val
  }
  input = walkResolver(resolvers(undefined, input), resolvers)
  const tags: (HeadTag | HeadTag[])[] = []
  for (const key in input) {
    const value = input[key]
    if (value !== undefined) {
      for (const v of (Array.isArray(value) ? value : [value]))
        tags.push(normalizeTag(key as keyof ResolvableHead, v))
    }
  }
  return tags.flat()
}
