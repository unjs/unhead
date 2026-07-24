import type { HeadTag } from '../../types'
import { SelfClosingTags, TagsWithInnerContent } from '../../utils'
import { propsToString } from './propsToString'

const ESCAPE_HTML_RE = /[&<>"'/]/g
const CLOSE_TAG_RE: Record<string, RegExp> = {}
const ESCAPE_HTML_MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#x27;', '/': '&#x2F;' }

/* @__PURE__ */
export function escapeHtml(str: string) {
  return str.replace(ESCAPE_HTML_RE, c => ESCAPE_HTML_MAP[c])
}

/* @__PURE__ */
export function tagToString<T extends HeadTag>(tag: T) {
  const attrs = propsToString(tag.props)
  const openTag = `<${tag.tag}${attrs}>`
  // self-closing (meta/link/base) is the common SSR tag: one Set lookup, no close tag.
  // SelfClosingTags and TagsWithInnerContent are disjoint, so the second SelfClosingTags.has()
  // the content branch used to do was provably dead.
  if (SelfClosingTags.has(tag.tag))
    return openTag
  if (!TagsWithInnerContent.has(tag.tag))
    return `${openTag}</${tag.tag}>`

  // dangerously using innerHTML, we don't encode this
  let content = String(tag.textContent ?? tag.innerHTML ?? '')
  content = tag.tag === 'title' ? escapeHtml(content) : content.replace(CLOSE_TAG_RE[tag.tag] ||= new RegExp(`<\/${tag.tag}`, 'gi'), `<\\/${tag.tag}`)
  return `${openTag}${content}</${tag.tag}>`
}
