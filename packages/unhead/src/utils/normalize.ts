import type { HeadTag, PropResolver, ResolvableHead } from '../types'
import { walkResolver } from '../utils/walkResolver'
import { DupeableTags, HasElementTags, TagConfigKeys } from './const'

// internal marker passed through normalizeTag/normalizeProps when input comes
// straight from a head entry and still needs function/prop resolution
interface ResolveCtx {
  resolve?: PropResolver
  // observes whether normalization was pure (no functions unwrapped, no
  // resolver rewrites) — pure inputs are eligible for process-level sharing
  track?: { pure: boolean }
}

const isUnsafeKey = (k: string) => k === '__proto__' || k === 'constructor' || k === 'prototype'

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

export function normalizeProps(tag: HeadTag, input: Record<string, any>, _resolveCtx?: ResolveCtx): HeadTag {
  tag.props = tag.props || {}
  if (!input)
    return tag
  if (tag.tag === 'templateParams') {
    tag.props = _resolveCtx ? walkResolver(input, _resolveCtx.resolve, undefined, _resolveCtx.track) : input
    return tag
  }
  const isHtmlTag = HasElementTags.has(tag.tag) || tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs'

  for (const prop in input) {
    if (isUnsafeKey(prop))
      continue
    let value = input[prop]
    if (_resolveCtx)
      value = walkResolver(value, _resolveCtx.resolve, prop, _resolveCtx.track)
    if (value === null) {
      tag.props[prop] = null as any
    }
    else if (prop === 'class' || prop === 'style') {
      tag.props[prop] = normalizeStyleClassProps(prop, value) as any
    }
    else if (TagConfigKeys.has(prop)) {
      if ((prop === 'textContent' || prop === 'innerHTML') && typeof value === 'object') {
        const type = walkResolver(input.type, _resolveCtx?.resolve, 'type', _resolveCtx?.track) || 'application/json'
        if (type.endsWith('json') || type === 'speculationrules' || type === 'importmap') {
          tag.props.type = type
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
      const isData = prop.startsWith('data-')
      const key = isHtmlTag && !isData ? prop.toLowerCase() : prop
      const str = String(value)
      const isMeta = tag.tag === 'meta' && key === 'content'
      tag.props[key] = str === 'true' || str === '' ? (isData || isMeta ? str : true) : !value && isData && str === 'false' ? 'false' : value
    }
  }
  return tag
}

function normalizeTag(tagName: HeadTag['tag'], _input: HeadTag['props'] | string, resolveCtx?: ResolveCtx): HeadTag | HeadTag[] {
  const isObjectInput = typeof _input === 'object'
  const input = isObjectInput
    ? _input as HeadTag['props']
    : { [(tagName === 'script' || tagName === 'noscript' || tagName === 'style') ? 'innerHTML' : 'textContent']: _input }
  // wrapped scalars were already resolved at the entry level
  const tag = normalizeProps({ tag: tagName, props: {} }, input, isObjectInput ? resolveCtx : undefined)
  if (tag.key && DupeableTags.has(tag.tag))
    tag.props['data-hid'] = tag._h = tag.key
  if (tag.tag === 'script' && typeof tag.innerHTML === 'object') {
    tag.innerHTML = JSON.stringify(tag.innerHTML)
    tag.props.type = tag.props.type || 'application/json'
  }
  return Array.isArray(tag.props.content) ? tag.props.content.map(v => ({ ...tag, props: { ...tag.props, content: v } })) : tag
}

export function normalizeEntryToTags(input: any, propResolvers: PropResolver[], track?: { pure: boolean }): HeadTag[] {
  if (!input)
    return []
  const resolve: PropResolver | undefined = propResolvers.length === 0
    ? undefined
    : propResolvers.length === 1
      ? propResolvers[0]
      : (key, val, tag) => {
          for (let i = 0; i < propResolvers.length; i++)
            val = propResolvers[i](key, val, tag)
          return val
        }
  // unwrap function values (except titleTemplate/on* keys) then apply prop resolvers,
  // matching the old walkResolver per-node semantics
  const unwrap = (v: any, key?: string) => {
    if (typeof v === 'function' && (!key || (key !== 'titleTemplate' && !key.startsWith('on')))) {
      if (track)
        track.pure = false
      v = v()
    }
    if (!resolve)
      return v
    const r = resolve(key, v)
    if (track && r !== v)
      track.pure = false
    return r
  }
  // two passes match the old pre-walk + root walkResolver calls
  input = unwrap(unwrap(input))
  const resolveCtx: ResolveCtx = { resolve, track }
  const tags: (HeadTag | HeadTag[])[] = []
  for (const key in input) {
    if (isUnsafeKey(key))
      continue
    const isResolverKey = key === '_resolver'
    const value = isResolverKey ? input[key] : unwrap(input[key], key)
    if (value === undefined)
      continue
    const ctx = isResolverKey ? undefined : resolveCtx
    const isArray = Array.isArray(value)
    for (const v of isArray ? value : [value]) {
      // array items are unwrapped and resolved without key context
      tags.push(normalizeTag(key as keyof ResolvableHead, ctx && isArray ? unwrap(v) : v, ctx))
    }
  }
  return tags.flat()
}
