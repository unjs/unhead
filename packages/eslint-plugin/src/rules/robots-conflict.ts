import type { Rule } from 'eslint'
import { createTagVisitor, getStringProp } from '../utils/visitor'

export const robotsConflict: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow conflicting directives in `robots` meta content.',
      recommended: true,
      url: 'https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag',
    },
    schema: [],
    messages: {
      indexConflict: 'Robots meta has conflicting "index" and "noindex" directives.',
      followConflict: 'Robots meta has conflicting "follow" and "nofollow" directives.',
    },
  },
  create: createTagVisitor({
    onTag(tag, tagType, ctx) {
      if (tagType !== 'meta')
        return
      if (getStringProp(tag, 'name') !== 'robots')
        return
      const content = getStringProp(tag, 'content')
      if (!content)
        return
      const directives = content.toLowerCase().split(',').map(d => d.trim())
      if (directives.includes('index') && directives.includes('noindex'))
        ctx.report({ node: tag, messageId: 'indexConflict' })
      if (directives.includes('follow') && directives.includes('nofollow'))
        ctx.report({ node: tag, messageId: 'followConflict' })
    },
  }),
}
