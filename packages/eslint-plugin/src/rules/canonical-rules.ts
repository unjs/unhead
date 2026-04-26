import type { Rule } from 'eslint'
import { nonAbsoluteCanonical as predicate } from 'unhead/validate'
import { createTagPredicateRule } from '../utils/createPredicateRule'

export const nonAbsoluteCanonical: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Canonical URLs must be absolute.',
      recommended: true,
      url: 'https://developers.google.com/search/docs/crawling-indexing/canonicalization',
    },
    schema: [],
  },
  create: createTagPredicateRule(predicate),
}
