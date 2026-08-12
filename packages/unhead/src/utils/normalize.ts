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

function resolveShallowValue(value: any, key?: string, resolve?: PropResolver): any {
  if (key === '_resolver')
    return value
  if (typeof value === 'function' && (!key || (key !== 'titleTemplate' && !key.startsWith('on'))))
    value = value()
  return resolve ? resolve(key, value) : value
}

function resolveServerEventHandler(key: string | undefined, value: any): any {
  return typeof value === 'function' && key?.startsWith('on')
    ? `this.dataset.${key}fired = true`
    : value
}

export function createPropResolver(propResolvers: PropResolver[], serverEventHandlers: boolean): PropResolver | undefined {
  if (!propResolvers.length && !serverEventHandlers)
    return
  if (!propResolvers.length)
    return resolveServerEventHandler
  return (key, value) => {
    for (let i = 0; i < propResolvers.length; i++)
      value = propResolvers[i](key, value)
    return serverEventHandlers ? resolveServerEventHandler(key, value) : value
  }
}

function resolveObjectChildren(input: Record<string, any>, resolve?: PropResolver): Record<string, any> {
  let output: Record<string, any> | undefined
  for (const key in input) {
    const unsafe = isUnsafeKey(key)
    const value = unsafe ? undefined : walkResolver(input[key], resolve, key)
    if (!output && (unsafe || value !== input[key])) {
      output = {}
      for (const previous in input) {
        if (previous === key)
          break
        output[previous] = input[previous]
      }
    }
    if (output && !unsafe)
      output[key] = value
  }
  return output || input
}

export function normalizeProps(tag: HeadTag, input: Record<string, any>, serverEventHandlers = false, resolveFunctions = false, resolve?: PropResolver): HeadTag {
  tag.props = tag.props || {}
  if (!input)
    return tag
  if (tag.tag === 'templateParams') {
    tag.props = resolveFunctions ? resolveObjectChildren(input, resolve) : input
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
    const value = resolveFunctions ? walkResolver(input[prop], resolve, prop) : input[prop]
    if (value === null) {
      tag.props[key] = null as any
    }
    else if (prop === 'class' || prop === 'style') {
      tag.props[prop] = normalizeStyleClassProps(prop, value) as any
    }
    else if (serverEventHandlers && prop.startsWith('on') && typeof value === 'function') {
      tag.props[key] = `this.dataset.${prop}fired = true`
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

export function resolveHeadInput(input: any, propResolvers: PropResolver[], serverEventHandlers = false): any {
  const resolve = createPropResolver(propResolvers, serverEventHandlers)
  if (resolve) {
    // Resolve the root before walking so ref-wrapped functions are unwrapped.
    input = resolve(undefined, input)
  }
  return walkResolver(input, resolve)
}

function normalizeTag(tagName: HeadTag['tag'], _input: HeadTag['props'] | string, serverEventHandlers: boolean, resolve?: PropResolver): HeadTag | HeadTag[] {
  if (typeof _input !== 'object' || typeof _input === 'function') {
    const content = (tagName === 'script' || tagName === 'noscript' || tagName === 'style') ? 'innerHTML' : 'textContent'
    return { tag: tagName, props: {}, [content]: _input }
  }
  const tag = normalizeProps({ tag: tagName, props: {} }, _input, serverEventHandlers, true, resolve)
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

export function normalizeEntryToTags(input: any, propResolvers: PropResolver[], serverEventHandlers = false, _resolve?: PropResolver): HeadTag[] {
  if (!input)
    return []
  if (typeof input === 'function')
    input = input()
  const resolve = _resolve || createPropResolver(propResolvers, serverEventHandlers)
  // The root intentionally passes through the resolver chain twice. The first
  // pass unwraps refs, then walkResolver invokes a function returned by a ref.
  if (resolve) {
    input = resolve(undefined, input)
    input = resolveShallowValue(input, undefined, resolve)
  }
  const tags: HeadTag[] = []
  for (const key in input) {
    if (isUnsafeKey(key))
      continue
    const value = resolveShallowValue(input[key], key, resolve)
    if (value !== undefined) {
      if (Array.isArray(value)) {
        for (const v of value) pushNormalizedTag(tags, normalizeTag(key as keyof ResolvableHead, resolveShallowValue(v, undefined, resolve), serverEventHandlers, resolve))
      }
      else {
        pushNormalizedTag(tags, normalizeTag(key as keyof ResolvableHead, value, serverEventHandlers, resolve))
      }
    }
  }
  return tags
}
