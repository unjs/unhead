import type { Rule } from 'eslint'
import { validateInputShape } from 'unhead/validate'
import { createInputShapePredicateRule } from '../utils/createPredicateRule'

export const inputShape: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate statically-known head input and attribute value shapes.',
      recommended: true,
      url: 'https://unhead.unjs.io/docs/head/api/composables/use-head',
    },
    schema: [],
  },
  create: createInputShapePredicateRule(validateInputShape),
}
