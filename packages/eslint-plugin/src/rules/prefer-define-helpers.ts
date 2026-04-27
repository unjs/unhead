import type { Rule } from 'eslint'
import { preferDefineHelpers as predicate } from 'unhead/validate'
import { createTagPredicateRule } from '../utils/createPredicateRule'

export const preferDefineHelpers: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Wrap tag object literals in their `defineX` helper for type narrowing.',
      recommended: false,
      url: 'https://unhead.unjs.io/docs/typescript/head/api/utilities',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [],
  },
  create: createTagPredicateRule(predicate, { needsHelpers: true }),
}
