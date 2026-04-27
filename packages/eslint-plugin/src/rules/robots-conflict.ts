import type { Rule } from 'eslint'
import { robotsConflict as predicate } from 'unhead/validate'
import { createTagPredicateRule } from '../utils/createPredicateRule'

export const robotsConflict: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow conflicting directives in `robots` meta content.',
      recommended: true,
      url: 'https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag',
    },
    schema: [],
  },
  create: createTagPredicateRule(predicate),
}
