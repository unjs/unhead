import type { HeadTag } from '../../types'
import { SelfClosingTags, TagsWithInnerContent } from '../../utils'
import { propsToString } from './propsToString'

const ESCAPE_HTML_RE = /[&<>"'/]/g
const ESCAPE_MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#x27;', '/': '&#x2F;' }

/* @__PURE__ */
export function escapeHtml(str: string) {
  return str.replace(ESCAPE_HTML_RE, c => ESCAPE_MAP[c] || c)
}

/* @__PURE__ */
export function tagToString<T extends HeadTag>(tag: T) {
  const attrs = propsToString(tag.props)
  const openTag = `<${tag.tag}${attrs}>`
  // get the encoding depending on the tag type
  if (!TagsWithInnerContent.has(tag.tag))
    return SelfClosingTags.has(tag.tag) ? openTag : `${openTag}</${tag.tag}>`

  // dangerously using innerHTML, we don't encode this
  let content = String(tag.textContent || tag.innerHTML || '')
  content = tag.tag === 'title' ? escapeHtml(content) : content.replace(new RegExp(`<\/${tag.tag}`, 'gi'), `<\\/${tag.tag}`)
  return SelfClosingTags.has(tag.tag) ? openTag : `${openTag}${content}</${tag.tag}>`
}
