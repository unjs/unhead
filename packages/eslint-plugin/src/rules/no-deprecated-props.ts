import type { Rule } from 'eslint'
import { noDeprecatedProps as predicate } from 'unhead/validate'
import { createTagPredicateRule } from '../utils/createPredicateRule'

export const noDeprecatedProps: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow deprecated v2 unhead tag props (children, hid/vmid, body).',
      recommended: true,
      url: 'https://unhead.unjs.io/docs/migration/v2-to-v3',
    },
    fixable: 'code',
    schema: [],
  },
  create: createTagPredicateRule(predicate),
}
