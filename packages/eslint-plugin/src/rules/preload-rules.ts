import type { Rule } from 'eslint'
import { createTagVisitor, findProperty, getStringProp } from '../utils/visitor'

export const preloadMissingAs: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: '`<link rel="preload">` requires an `as` attribute.',
      recommended: true,
      url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/preload',
    },
    schema: [],
    messages: {
      missingAs: 'Preload link is missing the required "as" attribute.',
    },
  },
  create: createTagVisitor({
    onTag(tag, tagType, ctx) {
      if (tagType !== 'link')
        return
      if (getStringProp(tag, 'rel') !== 'preload')
        return
      if (!findProperty(tag, 'as'))
        ctx.report({ node: tag, messageId: 'missingAs' })
    },
  }),
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
    messages: {
      missingCrossorigin: 'Font preload requires "crossorigin" — without it the font will be fetched twice.',
    },
  },
  create: createTagVisitor({
    onTag(tag, tagType, ctx) {
      if (tagType !== 'link')
        return
      if (getStringProp(tag, 'rel') !== 'preload')
        return
      if (getStringProp(tag, 'as') !== 'font')
        return
      if (findProperty(tag, 'crossorigin'))
        return
      const asProp = findProperty(tag, 'as')!
      ctx.report({
        node: tag,
        messageId: 'missingCrossorigin',
        fix: fixer => fixer.insertTextAfter(asProp, `, crossorigin: 'anonymous'`),
      })
    },
  }),
}
