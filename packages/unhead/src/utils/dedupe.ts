import type { HeadTag } from '../types'
import { MetaTagsArrayable, TagsWithInnerContent, UniqueTags } from './const'

const META_NOREWRITE_RE = /^(?:viewport|description|keywords|robots)$/
const META_KEY_ATTRS = ['name', 'property', 'http-equiv'] as const

/**
 * Rebuilds a value with every object's keys sorted, so two payloads with the
 * same shape but different insertion order serialise identically. Arrays stay
 * order-sensitive: `[1,2]` and `[2,1]` are genuinely different.
 *
 * `JSON.stringify` still does the serialising, so `Date`, `toJSON`, `NaN`, and
 * `undefined` behave exactly as they did before.
 */
function sortKeysDeep(value: unknown, seen: Set<object>): unknown {
  if (!value || typeof value !== 'object')
    return value
  if (seen.has(value as object))
    throw new TypeError('Converting circular structure to JSON')
  seen.add(value as object)
  let out: unknown
  if (Array.isArray(value)) {
    out = value.map(v => sortKeysDeep(v, seen))
  }
  else if (typeof (value as { toJSON?: unknown }).toJSON === 'function') {
    out = value
  }
  else {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort())
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key], seen)
    out = sorted
  }
  seen.delete(value as object)
  return out
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value, new Set())) as string
}

export function isMetaArrayDupeKey(v: string) {
  const i = v.indexOf(':')
  if (i === -1)
    return false
  const key = v.slice(i + 1)
  return MetaTagsArrayable.has(key)
    || key.startsWith('og:image:')
    || key.startsWith('og:video:')
    || key.startsWith('og:audio:')
    || key.startsWith('twitter:image:')
}

export function dedupeKey<T extends HeadTag>(tag: T): string | undefined {
  const { props, tag: t, key } = tag
  if (UniqueTags.has(t))
    return t
  // semantic link singletons; must win over an explicit `key`
  if (t === 'link') {
    if (props.rel === 'canonical')
      return 'canonical'
    if (props.rel === 'alternate' && props.hreflang)
      return `alternate:${props.hreflang}`
  }
  if (props.charset)
    return 'charset'
  if (t === 'meta') {
    for (const n of META_KEY_ATTRS) {
      const v = props[n]
      if (v !== undefined)
        return `meta:${v}${(typeof v !== 'string' || !v.includes(':')) && !META_NOREWRITE_RE.test(v) && key ? `:key:${key}` : ''}`
    }
  }
  if (key)
    return `${t}:key:${key}`
  if (props.id)
    return `${t}:id:${props.id}`
  // after key/id so an explicit key still allows multiple links with the same rel + href
  if (t === 'link' && props.rel && props.href)
    return `link:${props.rel}:${props.href}`
  return TagsWithInnerContent.has(t) && (tag.textContent || tag.innerHTML) ? `${t}:content:${tag.textContent || tag.innerHTML}` : undefined
}

export function hashTag(tag: HeadTag) {
  const identity = tag._h || tag._d || tag.textContent || tag.innerHTML
  if (identity)
    return identity
  // sort so the hash is stable across differing prop insertion orders (#823)
  const keys = Object.keys(tag.props).sort()
  let hash = `${tag.tag}:`
  let separator = ''
  for (const key of keys) {
    hash += `${separator}${key}:${String(tag.props[key])}`
    separator = ','
  }
  return hash
}
