import type { Rule } from 'eslint'
import { viewportUserScalable as predicate } from 'unhead/validate'
import { createTagPredicateRule } from '../utils/createPredicateRule'

export const viewportUserScalable: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow viewport meta values that block user zoom (a11y).',
      recommended: true,
      url: 'https://www.w3.org/WAI/WCAG22/Understanding/reflow.html',
    },
    schema: [],
  },
  create: createTagPredicateRule(predicate),
}
