import type { Rule } from 'eslint'
import { createTagVisitor, findProperty, getStringProp } from '../utils/visitor'

export const emptyMetaContent: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow meta tags with empty `content`.',
      recommended: true,
      url: 'https://unhead.unjs.io/docs/typescript/head/api/composables/use-seo-meta',
    },
    schema: [],
    messages: {
      empty: 'Meta tag "{{key}}" has empty content.',
    },
  },
  create: createTagVisitor({
    onTag(tag, tagType, ctx) {
      if (tagType !== 'meta')
        return
      const contentProp = findProperty(tag, 'content')
      if (!contentProp)
        return
      const value = contentProp.value
      if (value.type !== 'Literal' || value.value !== '')
        return
      const key = getStringProp(tag, 'name') || getStringProp(tag, 'property') || 'meta'
      ctx.report({ node: contentProp, messageId: 'empty', data: { key } })
    },
  }),
}
