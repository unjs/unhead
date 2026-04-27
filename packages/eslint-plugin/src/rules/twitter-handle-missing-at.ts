import type { Rule } from 'eslint'
import { twitterHandleMissingAt as predicate } from 'unhead/validate'
import { createTagPredicateRule } from '../utils/createPredicateRule'

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
  },
  create: createTagPredicateRule(predicate),
}
