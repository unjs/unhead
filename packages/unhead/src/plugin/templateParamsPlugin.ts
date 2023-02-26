import { defineHeadPlugin } from '@unhead/shared'
import type { TemplateParams } from '@unhead/schema'

function processTemplateParams(s: string, config: TemplateParams) {
  // for each %<word> token replace it with the corresponding runtime config or an empty value
  const replacer = (preserveToken?: boolean) => (_: unknown, token: string) => {
    if (token === 'pageTitle' || token === 's')
      return config.pageTitle

    let val
    // support . notation
    if (token.includes('.'))
      // @ts-expect-error untyped
      val = token.split('.').reduce((acc, key) => acc[key] || {}, config)
    else
      val = config[token]

    return val || (preserveToken ? token : '')
  }
  let template = s
    // @ts-expect-error untyped
    .replace(/%(\w+\.?\w*)%/g, replacer())
    // @ts-expect-error untyped
    .replace(/%(\w+\.?\w*)/g, replacer(true))
    .trim()

  if (config.separator) {
    // avoid the title ending with a separator
    if (template.endsWith(config.separator))
      template = template.slice(0, -config.separator.length).trim()
    if (template.startsWith(config.separator))
      template = template.slice(config.separator.length).trim()
    // make sure we don't have two separators next to each other
    template = template.replace(new RegExp(`\\${config.separator}\\s*\\${config.separator}`, 'g'), config.separator)
  }
  return template
}
export function TemplateParamsPlugin() {
  return defineHeadPlugin({
    hooks: {
      'tags:resolve': (ctx) => {
        const { tags } = ctx
        // find templateParams
        const title = tags.find(tag => tag.tag === 'title')?.textContent
        const idx = tags.findIndex(tag => tag.tag === 'templateParams')
        // we always process params so we can substitute the title
        const params = idx !== -1 ? tags[idx].textContent as unknown as TemplateParams : {}
        params.pageTitle = params.pageTitle || title || ''
        delete tags[idx]
        for (const tag of tags.filter(Boolean)) {
          if (['titleTemplate', 'title'].includes(tag.tag) && typeof tag.textContent === 'string')
            tag.textContent = processTemplateParams(tag.textContent, params)
          else if (tag.tag === 'meta' && typeof tag.props.content === 'string')
            tag.props.content = processTemplateParams(tag.props.content, params)
          else if (tag.tag === 'script' && ['application/json', 'application/ld+json'].includes(tag.props.type) && typeof tag.innerHTML === 'string')
            tag.innerHTML = processTemplateParams(tag.innerHTML, params)
        }
        ctx.tags = tags.filter(Boolean)
      },
    },
  })
}
