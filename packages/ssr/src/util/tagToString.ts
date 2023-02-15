import type { HeadTag } from '@unhead/schema'
import { SelfClosingTags, TagsWithInnerContent } from '@unhead/shared'
import { propsToString } from './propsToString'

export function encodeHtmlEntities(str: string) {
  return str.replace(/[\u00A0-\u9999<>\&]/gim, i => `&#${i.charCodeAt(0)};`)
}

export const tagToString = <T extends HeadTag>(tag: T) => {
  const attrs = propsToString(tag.props)
  const openTag = `<${tag.tag}${attrs}>`
  // get the encoding depending on the tag type
  if (!TagsWithInnerContent.includes(tag.tag))
    return SelfClosingTags.includes(tag.tag) ? openTag : `${openTag}</${tag.tag}>`

  let content = tag.children || ''
  if (content && tag.tag === 'title')
    // content needs to be encoded to avoid XSS, only for title
    content = encodeHtmlEntities(content)
  return SelfClosingTags.includes(tag.tag) ? openTag : `${openTag}${content}</${tag.tag}>`
}
