import type { HeadTag, PropResolver, ResolvableHead } from '../types'
import { walkResolver } from '../utils/walkResolver'
import { INVALID_ATTR_NAME_RE } from './attrs'
import { DupeableTags, HasElementTags, TagConfigKeys } from './const'
import { canonicalStringify } from './dedupe'
import { isUnsafeKey } from './unsafeKey'

function isJsonScriptType(type: unknown): boolean {
  return typeof type === 'string' && (type.endsWith('json') || type === 'speculationrules' || type === 'importmap')
}

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
    if (isUnsafeKey(prop))
      continue
    const isData = prop.startsWith('data-')
    const isHtmlAttr = isHtmlTag && !TagConfigKeys.has(prop)
    const key = isHtmlAttr && !isData ? prop.toLowerCase() : prop
    if (isHtmlAttr && (!key || INVALID_ATTR_NAME_RE.test(key)))
      continue
    const value = input[prop]
    if (value === null) {
      tag.props[key] = null as any
    }
    else if (prop === 'class' || prop === 'style') {
      tag.props[prop] = normalizeStyleClassProps(prop, value) as any
    }
    else if (TagConfigKeys.has(prop)) {
      if ((prop === 'textContent' || prop === 'innerHTML') && typeof value === 'object') {
        const type = input.type || 'application/json'
        if (isJsonScriptType(type)) {
          tag.props.type = type
          // fingerprint with key-sorted serialisation so identity is insertion-order
          // independent, but render with JSON.stringify so output bytes are unchanged
          tag._c = canonicalStringify(value)
          tag[prop] = JSON.stringify(value)
        }
      }
      else {
        (tag as any)[prop] = value
        // JSON payloads rebuilt from server-rendered DOM arrive as strings (and users
        // may push strings directly); fingerprint the parsed value so identity matches
        // the object-push path. Malformed JSON cannot be fingerprinted: identity then
        // falls back to the literal string, which still matches identical DOM content.
        if (tag.tag === 'script' && (prop === 'textContent' || prop === 'innerHTML') && typeof value === 'string' && isJsonScriptType(input.type)) {
          try {
            tag._c = canonicalStringify(JSON.parse(value))
          }
          catch {}
        }
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

function normalizeTag(tagName: HeadTag['tag'], _input: HeadTag['props'] | string): HeadTag | HeadTag[] {
  const input = typeof _input === 'object' && typeof _input !== 'function'
    ? _input
    : { [(tagName === 'script' || tagName === 'noscript' || tagName === 'style') ? 'innerHTML' : 'textContent']: _input }
  const tag = normalizeProps({ tag: tagName, props: {} }, input)
  if (tag.key && DupeableTags.has(tag.tag))
    tag.props['data-hid'] = tag._h = tag.key
  if (tag.tag === 'script' && typeof tag.innerHTML === 'object') {
    tag._c = canonicalStringify(tag.innerHTML)
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
        for (const v of value) pushNormalizedTag(tags, normalizeTag(key as keyof ResolvableHead, v))
      }
      else {
        pushNormalizedTag(tags, normalizeTag(key as keyof ResolvableHead, value))
      }
    }
  }
  return tags
}
