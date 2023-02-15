import { defineHeadPlugin } from '@unhead/shared'

export const renderTitleTemplate = (
  template: string | ((title?: string) => string | null) | null,
  title?: string,
): string | null => {
  if (template == null)
    return title || null
  if (typeof template === 'function')
    return template(title)

  return template.replace('%s', title ?? '')
}

export const TitleTemplatePlugin = () => {
  return defineHeadPlugin({
    hooks: {
      'tags:resolve': (ctx) => {
        const { tags } = ctx
        let titleTemplateIdx = tags.findIndex(i => i.tag === 'titleTemplate')
        const titleIdx = tags.findIndex(i => i.tag === 'title')
        if (titleIdx !== -1 && titleTemplateIdx !== -1) {
          const newTitle = renderTitleTemplate(
            tags[titleTemplateIdx].children!,
            tags[titleIdx].children,
          )
          if (newTitle !== null) {
            tags[titleIdx].children = newTitle || tags[titleIdx].children
          }
          else {
            // remove the title tag
            delete tags[titleIdx]
          }
        }
        // titleTemplate is set but title is not set, convert to a title
        else if (titleTemplateIdx !== -1) {
          const newTitle = renderTitleTemplate(
            tags[titleTemplateIdx].children!,
          )
          if (newTitle !== null) {
            tags[titleTemplateIdx].children = newTitle
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
