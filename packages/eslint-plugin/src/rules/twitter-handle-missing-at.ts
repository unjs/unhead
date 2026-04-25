import type { Rule } from 'eslint'
import { createTagVisitor, findProperty, getStringProp } from '../utils/visitor'

const NUMERIC_RE = /^\d+$/

export const twitterHandleMissingAt: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Twitter handle meta values must start with `@`.',
      recommended: true,
      url: 'https://developer.x.com/en/docs/x-for-websites/cards/overview/markup',
    },
    fixable: 'code',
    schema: [],
    messages: {
      missingAt: '{{key}} should start with "@", received "{{value}}".',
    },
  },
  create: createTagVisitor({
    onTag(tag, tagType, ctx) {
      if (tagType !== 'meta')
        return
      const name = getStringProp(tag, 'name')
      if (name !== 'twitter:site' && name !== 'twitter:creator')
        return
      const contentProp = findProperty(tag, 'content')
      if (!contentProp)
        return
      const value = contentProp.value
      if (value.type !== 'Literal' || typeof value.value !== 'string')
        return
      const v = value.value
      if (v.startsWith('@') || NUMERIC_RE.test(v))
        return
      ctx.report({
        node: value,
        messageId: 'missingAt',
        data: { key: name, value: v },
        fix: fixer => fixer.replaceText(value, `'@${v}'`),
      })
    },
  }),
}
