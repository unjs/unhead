import type { HeadTag, PropResolver, ResolvableHead } from '../types'
import { walkResolver } from '../utils/walkResolver'
import { DupeableTags, TagConfigKeys } from './const'

function normalizeStyleClassProps(
  key: 'class' | 'style',
  value: any,
): Map<string, string> | Set<string> {
  const store = key === 'style' ? new Map() : new Set()

  function processValue(rawValue: string) {
    const value = rawValue.trim()
    if (!value)
      return

    if (key === 'style') {
      const [k, ...v] = value.split(':').map(s => s.trim())
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
          ? store.set(k.trim(), v)
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
      if (['textContent', 'innerHTML'].includes(key) && typeof value === 'object') {
        let type = input.type
        if (!input.type) {
          type = 'application/json'
        }
        if (!type?.endsWith('json') && type !== 'speculationrules') {
          return
        }
        input.type = type
        tag.props.type = type
        // @ts-expect-error untyped
        tag[key] = JSON.stringify(value)
      }
      else {
        // @ts-expect-error untyped
        tag[key] = value
      }
      return
    }

    const strValue = String(value)
    const isDataKey = key.startsWith('data-')

    if (strValue === 'true' || strValue === '') {
      // @ts-expect-error untyped
      tag.props[key] = isDataKey ? strValue : true
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
