/** Shared tag identity seam used by the loose compiler and DOM adoption. */
import { T_BASE, T_LINK, T_META, T_NOSCRIPT, T_STYLE, T_TITLE, T_TITLE_TEMPLATE, TAG_NAMES } from './core'

const META_NOREWRITE_RE = /^(?:viewport|description|keywords|robots)$/

export function identity(id: number, props: Record<string, any> | null, content: string | null, key: string | null): string {
  const name = TAG_NAMES[id]
  if (id === T_TITLE || id === T_BASE || id === T_TITLE_TEMPLATE)
    return name
  if (props) {
    if (id === T_LINK) {
      if (props.rel === 'canonical')
        return 'canonical'
      if (props.rel === 'alternate' && props.hreflang)
        return `alternate:${props.hreflang}`
    }
    if (props.charset)
      return 'charset'
    if (id === T_META) {
      const value = props.name ?? props.property ?? props['http-equiv']
      if (value !== undefined)
        return `meta:${value}${key && (typeof value !== 'string' || !value.includes(':')) && !META_NOREWRITE_RE.test(value) ? `:key:${key}` : ''}`
    }
  }
  if (key)
    return `${name}:key:${key}`
  if (props) {
    if (props.id)
      return `${name}:id:${props.id}`
    if (id === T_LINK && props.rel && props.href)
      return `link:${props.rel}:${props.href}`
  }
  return content && (id >= T_STYLE && id <= T_NOSCRIPT) ? `${name}:content:${content}` : ''
}
