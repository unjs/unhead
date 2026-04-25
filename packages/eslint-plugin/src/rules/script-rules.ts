import type { Rule } from 'eslint'
import { createTagVisitor, findProperty, getBooleanProp, getStringProp, hasInnerContent } from '../utils/visitor'

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
    messages: {
      deferModule: '"defer" is redundant on module scripts. Modules are deferred by default.',
    },
  },
  create: createTagVisitor({
    onTag(tag, tagType, ctx) {
      if (tagType !== 'script')
        return
      if (getStringProp(tag, 'type') !== 'module')
        return
      const deferProp = findProperty(tag, 'defer')
      if (!deferProp || getBooleanProp(tag, 'defer') !== true)
        return
      ctx.report({
        node: deferProp,
        messageId: 'deferModule',
        fix(fixer) {
          const sourceCode = ctx.sourceCode
          const tokenAfter = sourceCode.getTokenAfter(deferProp)
          if (tokenAfter && tokenAfter.value === ',')
            return fixer.removeRange([deferProp.range![0], tokenAfter.range![1]])
          const tokenBefore = sourceCode.getTokenBefore(deferProp)
          if (tokenBefore && tokenBefore.value === ',')
            return fixer.removeRange([tokenBefore.range![0], deferProp.range![1]])
          return fixer.remove(deferProp)
        },
      })
    },
  }),
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
    messages: {
      conflict: 'Script has both "src" and inline content. The browser will ignore the inline content.',
    },
  },
  create: createTagVisitor({
    onTag(tag, tagType, ctx) {
      if (tagType !== 'script')
        return
      if (!getStringProp(tag, 'src'))
        return
      if (hasInnerContent(tag))
        ctx.report({ node: tag, messageId: 'conflict' })
    },
  }),
}
