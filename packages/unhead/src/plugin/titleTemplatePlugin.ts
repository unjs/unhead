import { defineHeadPlugin, resolveTitleTemplate } from '@unhead/shared'

export const TitleTemplatePlugin = () => {
  return defineHeadPlugin({
    hooks: {
      'tags:resolve': (ctx) => {
        const { tags } = ctx
        let titleTemplateIdx = tags.findIndex(i => i.tag === 'titleTemplate')
        const titleIdx = tags.findIndex(i => i.tag === 'title')
        if (titleIdx !== -1 && titleTemplateIdx !== -1) {
          const newTitle = resolveTitleTemplate(
            tags[titleTemplateIdx].textContent!,
            tags[titleIdx].textContent,
          )
          if (newTitle !== null) {
            tags[titleIdx].textContent = newTitle || tags[titleIdx].textContent
          }
          else {
            // remove the title tag
            delete tags[titleIdx]
          }
        }
        // titleTemplate is set but title is not set, convert to a title
        else if (titleTemplateIdx !== -1) {
          const newTitle = resolveTitleTemplate(
            tags[titleTemplateIdx].textContent!,
          )
          if (newTitle !== null) {
            tags[titleTemplateIdx].textContent = newTitle
            tags[titleTemplateIdx].tag = 'title'
            titleTemplateIdx = -1
          }
        }
        if (titleTemplateIdx !== -1) {
          // remove the titleTemplate tag
          delete tags[titleTemplateIdx]
        }

        ctx.tags = tags.filter(Boolean)
      },
    },
  })
}
