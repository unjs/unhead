import type { Rule } from 'eslint'
import { numericTagPriority as predicate } from 'unhead/validate'
import { createTagPredicateRule } from '../utils/createPredicateRule'

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
  },
  create: createTagPredicateRule(predicate),
}
