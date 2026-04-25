import type { Rule } from 'eslint'
import type * as ESTree from 'estree'
import { findProperty, getCalleeName, getStringValue, HEAD_INPUT_CALLEES } from '../utils/visitor'

const HTML_CHARS_RE = /[<>]/

/**
 * `useHead({ title: '...<x>' })` and `useSeoMeta({ title: '...' })` only.
 * Title is a string-valued top-level prop, not a tag list, so this rule has
 * its own visitor rather than going through createTagVisitor.
 */
export const noHtmlInTitle: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'HTML characters in `<title>` are escaped, not rendered.',
      recommended: true,
      url: 'https://html.spec.whatwg.org/multipage/semantics.html#the-title-element',
    },
    schema: [],
    messages: {
      htmlChars: 'Title contains HTML characters which will be escaped, not rendered: "{{value}}".',
    },
  },
  create(ctx) {
    function checkTitle(value: ESTree.Node) {
      const str = getStringValue(value)
      if (str && HTML_CHARS_RE.test(str))
        ctx.report({ node: value, messageId: 'htmlChars', data: { value: str } })
    }

    return {
      CallExpression(node) {
        const name = getCalleeName(node)
        if (!name || !HEAD_INPUT_CALLEES.has(name))
          return
        const arg = node.arguments[0]
        if (arg?.type !== 'ObjectExpression')
          return
        const titleProp = findProperty(arg, 'title')
        if (titleProp)
          checkTitle(titleProp.value)
      },
    }
  },
}
