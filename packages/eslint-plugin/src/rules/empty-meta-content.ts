import type { Rule } from 'eslint'
import { emptyMetaContent as predicate } from 'unhead/validate'
import { createTagPredicateRule } from '../utils/createPredicateRule'

export const emptyMetaContent: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow meta tags with empty `content`.',
      recommended: true,
      url: 'https://unhead.unjs.io/docs/typescript/head/api/composables/use-seo-meta',
    },
    schema: [],
  },
  create: createTagPredicateRule(predicate),
}
