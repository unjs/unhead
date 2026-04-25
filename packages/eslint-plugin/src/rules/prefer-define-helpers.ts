import type { Rule } from 'eslint'
import { createTagVisitor } from '../utils/visitor'

const TAG_TO_HELPER: Record<string, string> = {
  meta: 'defineMeta',
  link: 'defineLink',
  script: 'defineScript',
  noscript: 'defineNoscript',
  style: 'defineStyle',
}

/**
 * Encourage wrapping tag object literals with their `defineX` helpers so
 * type narrowing kicks in (matters for v3 discriminated-union `useHead` types).
 */
export const preferDefineHelpers: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Wrap tag object literals in their `defineX` helper for type narrowing.',
      recommended: false,
      url: 'https://unhead.unjs.io/docs/typescript/head/api/utilities',
    },
    fixable: 'code',
    schema: [],
    messages: {
      preferHelper: 'Wrap this {{tag}} entry in `{{helper}}()` so unhead can narrow its type.',
    },
  },
  create: createTagVisitor({
    onTag(tag, tagType, ctx) {
      const helper = TAG_TO_HELPER[tagType]
      if (!helper)
        return

      // Only flag tags that live inside an array (a head input tag list).
      const parent = (tag as { parent?: { type: string } }).parent
      if (!parent || parent.type !== 'ArrayExpression')
        return

      ctx.report({
        node: tag,
        messageId: 'preferHelper',
        data: { tag: tagType, helper },
        fix: (fixer) => {
          const text = ctx.sourceCode.getText(tag)
          return fixer.replaceText(tag, `${helper}(${text})`)
        },
      })
    },
  }),
}
