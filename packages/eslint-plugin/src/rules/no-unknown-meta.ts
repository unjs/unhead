import type { Rule } from 'eslint'
import { noUnknownMeta as predicate } from 'unhead/validate'
import { createTagPredicateRule } from '../utils/createPredicateRule'

export const noUnknownMeta: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detect typos in meta `name` and `property` values.',
      recommended: true,
      url: 'https://unhead.unjs.io/docs/typescript/head/api/composables/use-seo-meta',
    },
    fixable: 'code',
    schema: [],
  },
  create: createTagPredicateRule(predicate),
}
