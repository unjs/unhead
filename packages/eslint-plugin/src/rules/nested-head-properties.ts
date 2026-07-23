import type { Rule } from 'eslint'
import { nestedHeadProperties as predicate } from 'unhead/validate'
import { createTagPredicateRule } from '../utils/createPredicateRule'

export const nestedHeadProperties: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow top-level head properties nested inside htmlAttrs or bodyAttrs.',
      recommended: true,
      url: 'https://unhead.unjs.io/docs/head/api/composables/use-head',
    },
    schema: [],
  },
  create: createTagPredicateRule(predicate),
}
