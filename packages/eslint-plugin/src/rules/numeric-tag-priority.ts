import type { Rule } from 'eslint'
import { createTagVisitor, findProperty } from '../utils/visitor'

export const numericTagPriority: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer string aliases for `tagPriority` over raw numbers.',
      recommended: true,
      url: 'https://unhead.unjs.io/docs/typescript/head/api/options/tag-priority',
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      numeric: 'Numeric tagPriority ({{value}}) is brittle. Prefer an alias (\'critical\' | \'high\' | \'low\') or \'before:<key>\' / \'after:<key>\'.',
      suggestCritical: 'Replace with \'critical\'',
      suggestHigh: 'Replace with \'high\'',
      suggestLow: 'Replace with \'low\'',
    },
  },
  create: createTagVisitor({
    onTag(tag, _tagType, ctx) {
      const prop = findProperty(tag, 'tagPriority')
      if (!prop)
        return
      const value = prop.value
      if (value.type !== 'Literal' || typeof value.value !== 'number')
        return
      ctx.report({
        node: value,
        messageId: 'numeric',
        data: { value: String(value.value) },
        suggest: (['critical', 'high', 'low'] as const).map(alias => ({
          messageId: alias === 'critical' ? 'suggestCritical' : alias === 'high' ? 'suggestHigh' : 'suggestLow',
          fix: fixer => fixer.replaceText(value, `'${alias}'`),
        })),
      })
    },
  }),
}
