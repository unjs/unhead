import type { HeadTag } from '../types'
import { defineHeadPlugin, resolveTitleTemplate } from '../utils'

export const TitleTemplatePlugin = defineHeadPlugin({
  key: 'title-template',
  hooks: {
    'tags:resolve': (ctx) => {
      const { tags } = ctx

      let titleTag: HeadTag | undefined
      let titleTemplateTag: HeadTag | undefined
      for (let i = 0; i < tags.length; i += 1) {
        const tag = tags[i]

        if (tag.tag === 'title') {
          titleTag = tag
        }
        else if (tag.tag === 'titleTemplate') {
          titleTemplateTag = tag
        }
      }

      if (titleTemplateTag && titleTag) {
        const newTitle = resolveTitleTemplate(
          titleTemplateTag.textContent!,
          titleTag.textContent,
        )

        if (newTitle !== null) {
          titleTag.textContent = newTitle || titleTag.textContent
        }
        else {
          ctx.tags.splice(ctx.tags.indexOf(titleTag), 1)
        }
      }
      else if (titleTemplateTag) {
        const newTitle = resolveTitleTemplate(
          titleTemplateTag.textContent!,
        )

        if (newTitle !== null) {
          titleTemplateTag.textContent = newTitle
          titleTemplateTag.tag = 'title'
          titleTemplateTag = undefined
        }
      }

      if (titleTemplateTag) {
        ctx.tags.splice(ctx.tags.indexOf(titleTemplateTag), 1)
      }
    },
  },
})
