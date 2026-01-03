import type { HeadTag } from '../../types'
import { SelfClosingTags, TagsWithInnerContent } from '../../utils'
import { propsToString } from './propsToString'

/* @__PURE__ */
export function escapeHtml(str: string) {
  return str.replace(/[&<>"'/]/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case '\'':
        return '&#x27;'
      case '/':
        return '&#x2F;'
      default:
        return char
    }
  })
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
