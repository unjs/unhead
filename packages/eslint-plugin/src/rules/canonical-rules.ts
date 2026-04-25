import type { Rule } from 'eslint'
import { createTagVisitor, findProperty, getStringProp } from '../utils/visitor'

function isAbsolute(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}

export const nonAbsoluteCanonical: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Canonical URLs must be absolute.',
      recommended: true,
      url: 'https://developers.google.com/search/docs/crawling-indexing/canonicalization',
    },
    schema: [],
    messages: {
      nonAbsolute: 'Canonical URL should be absolute, received "{{value}}".',
    },
  },
  create: createTagVisitor({
    onTag(tag, tagType, ctx) {
      if (tagType !== 'link')
        return
      if (getStringProp(tag, 'rel') !== 'canonical')
        return
      const hrefProp = findProperty(tag, 'href')
      if (!hrefProp)
        return
      const value = hrefProp.value
      if (value.type !== 'Literal' || typeof value.value !== 'string')
        return
      if (isAbsolute(value.value))
        return
      ctx.report({ node: value, messageId: 'nonAbsolute', data: { value: value.value } })
    },
  }),
}
