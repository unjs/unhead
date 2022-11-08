import { resolveTitleTemplateFromTags } from 'zhead'
import { defineHeadPlugin } from '.'

export const TitleTemplatePlugin = () => {
  return defineHeadPlugin({
    hooks: {
      'tags:resolve': (ctx) => {
        ctx.tags = resolveTitleTemplateFromTags(ctx.tags)
      },
    },
  })
}
