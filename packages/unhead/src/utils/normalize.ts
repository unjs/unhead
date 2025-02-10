import type { Head, HeadTag, PropResolver } from '../types'
import { DupeableTags, TagConfigKeys } from './const'

function normalizeStyleClassProps(k: 'class' | 'style', value: any, propResolvers?: PropResolver[]): Map<string, string> | Set<string> {
  const store = k === 'style' ? new Map() : new Set()

  const addClasses = (str: string) => {
    str.split(' ')
      .map(s => s.trim())
      .filter(Boolean)
      // @ts-expect-error untyped
      .forEach(c => store.add(c))
  }

  const addStyles = (str: string) => {
    const [k, ...v] = str.split(':').map(s => s.trim())
    if (k && v.length)
      // @ts-expect-error untyped
      store.set(k, v.join(':'))
  }

  const evaluateValue = (val: any): string => {
    if (typeof val === 'function') {
      return String(val())
    }
    if (propResolvers) {
      for (const resolver of propResolvers) {
        const resolved = resolver(k, val, null)
        if (resolved !== undefined) {
          val = resolved
        }
      }
    }
    return String(val)
  }

  if (typeof value === 'string' || typeof value === 'function') {
    const evaluatedValue = evaluateValue(value)
    if (k === 'style') {
      evaluatedValue.split(';').forEach(addStyles)
    }
    else {
      addClasses(evaluatedValue)
    }
  }
  else if (Array.isArray(value)) {
    value.forEach((item) => {
      const evaluatedItem = evaluateValue(item)
      const trimmed = evaluatedItem.trim()
      if (!trimmed)
        return

      if (k === 'style') {
        addStyles(trimmed)
      }
      else {
        addClasses(trimmed)
      }
    })
  }
  else if (value && typeof value === 'object') {
    Object.entries(value)
      .forEach(([key, v]) => {
        const evaluatedValue = evaluateValue(v)
        // Only add if the evaluated value is truthy
        if (evaluatedValue && evaluatedValue !== 'false') {
          if (k === 'style') {
            // @ts-expect-error untyped
            store.set(key.trim(), evaluatedValue)
          }
          else {
            addClasses(key)
          }
        }
      })
  }
  // @ts-expect-error untyped
  return store
}

export function normalizeProps(tag: HeadTag, input: Record<string, any>, propResolvers?: PropResolver[]): HeadTag {
  tag.props = tag.props || {}
  if (!input) {
    return tag
  }

  Object.entries(input).forEach(([key, value]) => {
    if (propResolvers) {
      for (const resolver of propResolvers) {
        const resolved = resolver(key, value, tag)
        if (resolved !== undefined) {
          value = resolved
        }
      }
    }
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

    if (typeof value === 'function' && !key.startsWith('on') && tag.tag !== 'titleTemplate') {
      value = value()
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
      tag.props[key] = isDataKey ? 'true' : true
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

function normalizeTag(tagName: HeadTag['tag'], _input: HeadTag['props'] | string, propResolvers: any): HeadTag | HeadTag[] {
  const input = (typeof _input === 'object' && typeof _input !== 'function')
    ? _input
    : { [(tagName === 'script' || tagName === 'noscript' || tagName === 'style') ? 'innerHTML' : 'textContent']: _input }

  const tag = normalizeProps({ tag: tagName, props: {} }, input, propResolvers)

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

export function normalizeEntryToTags(input: Head<any>, propResolvers: any): HeadTag[] {
  if (!input) {
    return []
  }

  const tags: (HeadTag | HeadTag[])[] = []

  if (typeof input === 'function') {
    // @ts-expect-error untyped
    return normalizeEntryToTags(input(), propResolvers)
  }

  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined)
      return

    if (propResolvers) {
      for (const resolver of propResolvers) {
        const resolved = resolver(key, value, null)
        if (resolved !== undefined) {
          value = resolved
        }
      }
    }

    if (Array.isArray(value)) {
      value.forEach((props) => {
        tags.push(normalizeTag(key as keyof Head, props, propResolvers))
      })
    }
    else if (typeof value === 'function' && key !== 'titleTemplate' && key !== 'title') {
      // @ts-expect-error untyped
      input[key] = normalizeEntryToTags(value(), propResolvers)
    }
    else {
      tags.push(normalizeTag(key as keyof Head, value, propResolvers))
    }
  })

  return tags.flat()
}
