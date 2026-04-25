import type { Rule } from 'eslint'
import { createTagVisitor, getStringProp } from '../utils/visitor'

const USER_SCALABLE_NO_RE = /user-scalable\s*=\s*no(?:\s|,|$)/i
const MAX_SCALE_RE = /maximum-scale\s*=\s*1(?:\.0?)?(?:\s|,|$)/i

export const viewportUserScalable: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow viewport meta values that block user zoom (a11y).',
      recommended: true,
      url: 'https://www.w3.org/WAI/WCAG22/Understanding/reflow.html',
    },
    schema: [],
    messages: {
      userScalable: 'viewport "user-scalable=no" prevents zooming and harms accessibility.',
      maxScale: 'viewport "maximum-scale=1" limits zooming and may harm accessibility.',
    },
  },
  create: createTagVisitor({
    onTag(tag, tagType, ctx) {
      if (tagType !== 'meta')
        return
      if (getStringProp(tag, 'name') !== 'viewport')
        return
      const content = getStringProp(tag, 'content')
      if (!content)
        return
      if (USER_SCALABLE_NO_RE.test(content))
        ctx.report({ node: tag, messageId: 'userScalable' })
      if (MAX_SCALE_RE.test(content))
        ctx.report({ node: tag, messageId: 'maxScale' })
    },
  }),
}
