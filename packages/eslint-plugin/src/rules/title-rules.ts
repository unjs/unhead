import type { Rule } from 'eslint'
import { noHtmlInTitle as predicate } from 'unhead/validate'
import { createHeadInputPredicateRule } from '../utils/createPredicateRule'

export const noHtmlInTitle: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'HTML characters in `<title>` are escaped, not rendered.',
      recommended: true,
      url: 'https://html.spec.whatwg.org/multipage/semantics.html#the-title-element',
    },
    schema: [],
  },
  create: createHeadInputPredicateRule(predicate),
}
