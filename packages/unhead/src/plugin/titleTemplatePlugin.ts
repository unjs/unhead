import { resolveTitleTemplateFromTags } from 'zhead'
import { defineHeadPlugin } from '.'

export const titleTemplatePlugin = defineHeadPlugin({
  hooks: {
    'tags:resolve': (ctx) => {
      ctx.tags = resolveTitleTemplateFromTags(ctx.tags)
    },
  },
})
