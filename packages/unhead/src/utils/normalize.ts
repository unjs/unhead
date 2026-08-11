import type { HeadTag, PropResolver, ResolvableHead } from '../types'
import { walkResolver } from '../utils/walkResolver'
import { INVALID_ATTR_NAME_RE } from './attrs'
import { DupeableTags, HasElementTags, TagConfigKeys } from './const'
import { isUnsafeKey } from './unsafeKey'

function normalizeStyleClassProps(
  key: 'class' | 'style',
  value: any,
): Map<string, string> | Set<string> {
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

function normalizePropsInternal(tag: HeadTag, input: Record<string, any>, resolveValues = false, resolve?: PropResolver): HeadTag {
  tag.props = tag.props || {}
  if (!input)
    return tag
  if (tag.tag === 'templateParams') {
    tag.props = input
    return tag
  }
  const isHtmlTag = HasElementTags.has(tag.tag) || tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs'

  for (const prop in input) {
    if (isUnsafeKey(prop))
      continue
    const isData = prop.startsWith('data-')
    const isHtmlAttr = isHtmlTag && !TagConfigKeys.has(prop)
    const key = isHtmlAttr && !isData ? prop.toLowerCase() : prop
    if (isHtmlAttr && (!key || INVALID_ATTR_NAME_RE.test(key)))
      continue
    const value = resolveValues ? walkResolver(input[prop], resolve, prop) : input[prop]
    if (value === null) {
      tag.props[key] = null as any
    }
    else if (prop === 'class' || prop === 'style') {
      tag.props[prop] = normalizeStyleClassProps(prop, value) as any
    }
    else if (TagConfigKeys.has(prop)) {
      if ((prop === 'textContent' || prop === 'innerHTML') && typeof value === 'object') {
        const type = input.type || 'application/json'
        if (type.endsWith('json') || type === 'speculationrules' || type === 'importmap') {
          tag.props.type = input.type = type
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
      const isMeta = tag.tag === 'meta' && key === 'content'
      tag.props[key] = str === 'true' || str === '' ? (isData || isMeta ? str : true) : !value && isData && str === 'false' ? 'false' : value
    }
  }
  return tag
}

export function normalizeProps(tag: HeadTag, input: Record<string, any>): HeadTag {
  return normalizePropsInternal(tag, input)
}

function createResolver(propResolvers: PropResolver[]): PropResolver | undefined {
  if (!propResolvers.length)
    return
  return (key, val) => {
    for (let i = 0; i < propResolvers.length; i++)
      val = propResolvers[i](key, val)
    return val
  }
}

function resolveShallow(input: any, resolve?: PropResolver, key?: string): any {
  if (key === '_resolver')
    return input
  if (typeof input === 'function' && (!key || (key !== 'titleTemplate' && !key.startsWith('on'))))
    input = input()
  return resolve ? resolve(key, input) : input
}

function resolveChildren(input: any, resolve?: PropResolver): any {
  if (Array.isArray(input)) {
    let next: any[] | undefined
    for (let i = 0; i < input.length; i++) {
      const value = walkResolver(input[i], resolve)
      if (next)
        next[i] = value
      else if (value !== input[i])
        next = [...input.slice(0, i), value]
    }
    return next || input
  }
  if (input?.constructor === Object) {
    let next: Record<string, any> | undefined
    for (const key in input) {
      const unsafe = isUnsafeKey(key)
      const value = unsafe ? undefined : walkResolver(input[key], resolve, key)
      if (!next && (unsafe || value !== input[key])) {
        next = {}
        for (const previousKey in input) {
          if (previousKey === key)
            break
          next[previousKey] = input[previousKey]
        }
      }
      if (next && !unsafe)
        next[key] = value
    }
    return next || input
  }
  return input
}

export function resolveHeadInput(input: any, propResolvers: PropResolver[]): any {
  const resolve = createResolver(propResolvers)
  // Resolve the root before walking so ref-wrapped functions are unwrapped.
  if (resolve)
    input = resolve(undefined, input)
  return walkResolver(input, resolve)
}

function normalizeTag(tagName: HeadTag['tag'], _input: HeadTag['props'] | string, resolveValues = false, resolve?: PropResolver): HeadTag | HeadTag[] {
  const isObjectInput = typeof _input === 'object' && typeof _input !== 'function'
  const input = isObjectInput
    ? _input
    : { [(tagName === 'script' || tagName === 'noscript' || tagName === 'style') ? 'innerHTML' : 'textContent']: _input }
  const tag = normalizePropsInternal({ tag: tagName, props: {} }, input, isObjectInput && resolveValues, resolve)
  if (tag.key && DupeableTags.has(tag.tag))
    tag.props['data-hid'] = tag._h = tag.key
  if (tag.tag === 'script' && typeof tag.innerHTML === 'object') {
    tag.innerHTML = JSON.stringify(tag.innerHTML)
    tag.props.type = tag.props.type || 'application/json'
  }
  if (Array.isArray(tag.props.content)) {
    const tags: HeadTag[] = []
    for (const content of tag.props.content) {
      tags.push({ ...tag, props: { ...tag.props, content } })
    }
    return tags
  }
  return tag
}

function pushNormalizedTag(tags: HeadTag[], tag: HeadTag | HeadTag[]) {
  if (Array.isArray(tag)) {
    for (const t of tag) tags.push(t)
  }
  else {
    tags.push(tag)
  }
}

function normalizeResolvedTag(tags: HeadTag[], tagName: HeadTag['tag'], input: any, resolveValues: boolean, resolve?: PropResolver) {
  if (resolveValues && (Array.isArray(input)
    || (input?.constructor === Object && (tagName === 'templateParams' || 'innerHTML' in input || 'textContent' in input)))) {
    input = resolveChildren(input, resolve)
    resolveValues = false
  }
  pushNormalizedTag(tags, normalizeTag(tagName, input, resolveValues && input?.constructor === Object, resolve))
}

export function normalizeEntryToTags(input: any, propResolvers: PropResolver[]): HeadTag[] {
  if (!input)
    return []
  if (typeof input === 'function')
    input = input()
  const resolve = createResolver(propResolvers)
  // The root intentionally passes through the resolver chain twice. The first
  // pass unwraps refs, then the shallow pass invokes a function returned by a ref.
  if (resolve)
    input = resolve(undefined, input)
  input = resolveShallow(input, resolve)
  const resolveValues = input?.constructor === Object
  const tags: HeadTag[] = []
  for (const key in input) {
    if (resolveValues && isUnsafeKey(key))
      continue
    const value = resolveValues ? resolveShallow(input[key], resolve, key) : input[key]
    if (value !== undefined) {
      if (Array.isArray(value)) {
        for (const v of value) {
          const resolved = resolveValues ? resolveShallow(v, resolve) : v
          normalizeResolvedTag(tags, key as keyof ResolvableHead, resolved, resolveValues, resolve)
        }
      }
      else {
        normalizeResolvedTag(tags, key as keyof ResolvableHead, value, resolveValues, resolve)
      }
    }
  }
  return tags
}
