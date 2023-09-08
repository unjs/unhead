import type { HeadTag } from '@unhead/schema'
import { SelfClosingTags, TagsWithInnerContent } from '@unhead/shared'
import { propsToString } from './propsToString'

export function escapeHtml(str: string) {
  /**
   * Encode the following characters:
   * & --> &amp;
   * < --> &lt;
   * > --> &gt;
   * " --> &quot;
   * ' --> &#x27;
   * / --> &#x2F;
   */
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

export function escapeJson(str: string) {
  return str.replace(/</g, '\\u003C')
}

export function tagToString<T extends HeadTag>(tag: T) {
  const attrs = propsToString(tag.props)
  const openTag = `<${tag.tag}${attrs}>`
  // get the encoding depending on the tag type
  if (!TagsWithInnerContent.includes(tag.tag))
    return SelfClosingTags.includes(tag.tag) ? openTag : `${openTag}</${tag.tag}>`

  if (tag.innerHTML && ['application/ld+json', 'application/json'].includes(tag.props.type))
    // ensure </script> tags get encoded
    tag.innerHTML = escapeJson(tag.innerHTML)

  // dangerously using innerHTML, we don't encode this
  let content = String(tag.innerHTML || '')
  if (tag.textContent)
    // content needs to be encoded to avoid XSS, only for title
    content = escapeHtml(String(tag.textContent))
  return SelfClosingTags.includes(tag.tag) ? openTag : `${openTag}${content}</${tag.tag}>`
}
