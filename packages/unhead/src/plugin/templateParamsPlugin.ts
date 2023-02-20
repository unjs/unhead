import { defineHeadPlugin } from '@unhead/shared'
import type { TemplateParams } from '@unhead/schema'

function processTemplateParams(s: string, config: TemplateParams) {
  // for each %<word> token replace it with the corresponding runtime config or an empty value
  const replacer = (preserveToken?: boolean) => (_: unknown, token: string) => {
    if (token === 'pageTitle' || token === 's')
      return '%s'

    let val
    // support . notation
    if (token.includes('.')) {
      val = token.split('.').reduce((acc, key) => acc[key] || {}, config)
    }
    else {
      val = config[token]
    }
    return val || (preserveToken ? token : '')
  }
  let template = s
    // @ts-expect-error untyped
    .replace(/%(\w+\.?\w+)%/g, replacer())
    // @ts-expect-error untyped
    .replace(/%(\w+\.?\w+)/g, replacer(true))
    .trim()

  if (config.separator) {
    // avoid the title ending with a separator
    if (template.endsWith(config.separator))
      template = template.slice(0, -config.separator.length).trim()
    if (template.startsWith(config.separator))
      template = template.slice(config.separator.length).trim()
  }
  return template
}
export function TemplateParamsPlugin() {
  return defineHeadPlugin({
    hooks: {
      'tags:resolve': (ctx) => {
        const { tags } = ctx
        // find templateParams
        const templateParamsIdx = tags.findIndex(tag => tag.tag === 'templateParams')
        if (templateParamsIdx !== -1) {
          const templateParams = tags[templateParamsIdx].textContent as unknown as TemplateParams
          delete tags[templateParamsIdx]
          for (const tag of tags) {
            if (tag) {
              if (['titleTemplate', 'title'].includes(tag.tag) && typeof tag.textContent === 'string')
                tag.textContent = processTemplateParams(tag.textContent, templateParams)
              if (tag.tag === 'meta' && typeof tag.props.content === 'string')
                tag.props.content = processTemplateParams(tag.props.content, templateParams)
            }
          }
        }
        ctx.tags = tags.filter(Boolean)
      },
    },
  })
}