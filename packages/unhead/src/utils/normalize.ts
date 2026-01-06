import type { HeadTag, PropResolver, ResolvableHead } from '../types'
import { walkResolver } from '../utils/walkResolver'
import { DupeableTags, TagConfigKeys } from './const'

function normalizeStyleClassProps(
  key: 'class' | 'style',
  value: any,
): Map<string, string> | Set<string> {
  const store = key === 'style' ? new Map() : new Set()

  function processValue(rawValue: string) {
    if (rawValue == null)
      return
    const v = String(rawValue).trim()
    if (!v)
      return
    if (key === 'style') {
      const [k, ...rest] = v.split(':').map(s => s?.trim() || '')
      // @ts-expect-error untyped
      k && rest.length && store.set(k, rest.join(':'))
    }
    else {
      // @ts-expect-error untyped
      v.split(' ').filter(Boolean).forEach(c => store.add(c))
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

  Object.entries(input).forEach(([key, value]) => {
    // if the value is a primitive, return early
    if (value === null) {
      // @ts-expect-error untyped
      tag.props[key] = null
      return
    }

    if (key === 'class' || key === 'style') {
      // @ts-expect-error untyped
      tag.props[key] = normalizeStyleClassProps(key as 'class' | 'style', value)
      return
    }

    if (TagConfigKeys.has(key)) {
      if ((key === 'textContent' || key === 'innerHTML') && typeof value === 'object') {
        const type = input.type || 'application/json'
        if (!type.endsWith('json') && type !== 'speculationrules')
          return
        tag.props.type = input.type = type
        tag[key as 'textContent' | 'innerHTML'] = JSON.stringify(value)
      }
      else {
        // @ts-expect-error untyped
        tag[key] = value
      }
      return
    }

    const strValue = String(value)
    const isDataKey = key.startsWith('data-')
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
  if (!input)
    return []
  if (typeof input === 'function')
    input = input()
  const resolvers = (key?: string, val?: any) => {
    for (const r of propResolvers) val = r(key, val)
    return val
  }
  input = walkResolver(resolvers(undefined, input), resolvers)
  const tags: (HeadTag | HeadTag[])[] = []
  for (const key in input) {
    const value = input[key]
    if (value === undefined)
      continue
    for (const v of (Array.isArray(value) ? value : [value]))
      tags.push(normalizeTag(key as keyof ResolvableHead, v))
  }
  return tags.flat()
}
