import type { Rule } from 'eslint'
import type * as ESTree from 'estree'
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
/**
 * Helper names are exposed both from `unhead` and the framework subpaths
 * (`@unhead/vue`, `@unhead/react`, etc.). We don't restrict to a single source.
 */
function helperIsImported(program: ESTree.Program, helper: string): boolean {
  for (const node of program.body) {
    if (node.type !== 'ImportDeclaration')
      continue
    for (const spec of node.specifiers) {
      if (spec.type === 'ImportSpecifier' && spec.imported.type === 'Identifier' && spec.imported.name === helper)
        return true
      if (spec.type === 'ImportDefaultSpecifier' && spec.local.name === helper)
        return true
    }
  }
  return false
}

export const preferDefineHelpers: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Wrap tag object literals in their `defineX` helper for type narrowing.',
      recommended: false,
      url: 'https://unhead.unjs.io/docs/typescript/head/api/utilities',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [],
    messages: {
      preferHelper: 'Wrap this {{tag}} entry in `{{helper}}()` so unhead can narrow its type.',
      wrapInHelper: 'Wrap in `{{helper}}()` (you may need to import it).',
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

      const program = ctx.sourceCode.ast as ESTree.Program
      const imported = helperIsImported(program, helper)

      const wrap = (fixer: Rule.RuleFixer) => fixer.replaceText(tag, `${helper}(${ctx.sourceCode.getText(tag)})`)

      ctx.report({
        node: tag,
        messageId: 'preferHelper',
        data: { tag: tagType, helper },
        // Only autofix when the helper is already imported -- otherwise we'd
        // introduce a reference to an undeclared symbol. Surface a suggestion
        // either way so users in editors can opt in.
        fix: imported ? wrap : undefined,
        suggest: imported
          ? undefined
          : [{
              messageId: 'wrapInHelper',
              data: { helper },
              fix: wrap,
            }],
      })
    },
  }),
}
