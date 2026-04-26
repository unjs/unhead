import type { Rule } from 'eslint'
import { deferOnModuleScript as deferOnModuleScriptPredicate, scriptSrcWithContent as scriptSrcWithContentPredicate } from 'unhead/validate'
import { createTagPredicateRule } from '../utils/createPredicateRule'

export const deferOnModuleScript: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: '`defer` is redundant on `type="module"` scripts.',
      recommended: true,
      url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-defer',
    },
    fixable: 'code',
    schema: [],
  },
  create: createTagPredicateRule(deferOnModuleScriptPredicate),
}

export const scriptSrcWithContent: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'A script with `src` cannot also have inline content.',
      recommended: true,
      url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script',
    },
    schema: [],
  },
  create: createTagPredicateRule(scriptSrcWithContentPredicate),
}
