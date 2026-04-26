import type { Rule } from 'eslint'
import { preloadFontCrossorigin as preloadFontCrossoriginPredicate, preloadMissingAs as preloadMissingAsPredicate } from 'unhead/validate'
import { createTagPredicateRule } from '../utils/createPredicateRule'

export const preloadMissingAs: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: '`<link rel="preload">` requires an `as` attribute.',
      recommended: true,
      url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/preload',
    },
    schema: [],
  },
  create: createTagPredicateRule(preloadMissingAsPredicate),
}

export const preloadFontCrossorigin: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Font preloads require the `crossorigin` attribute.',
      recommended: true,
      url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/preload#cors-enabled_fetches',
    },
    fixable: 'code',
    schema: [],
  },
  create: createTagPredicateRule(preloadFontCrossoriginPredicate),
}
