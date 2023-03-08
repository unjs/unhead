import { defineHeadPlugin } from '@unhead/shared'
import type { TemplateParams } from '@unhead/schema'

function processTemplateParams(s: string, config: TemplateParams) {
  // for each %<word> token replace it with the corresponding runtime config or an empty value
  const sub = (_: unknown, token: string) => {
    let val: string
    if (token === 'pageTitle' || token === 's')
      val = config.pageTitle as string
    // support . notation
    else if (token.includes('.'))
      // @ts-expect-error untyped
      val = token.split('.').reduce((acc, key) => acc[key] || '', config) as string
    else
      val = config[token] as string
    return val || ''
  }
  let template = s
    // replace words which are using dot notation
    .replace(/%(\w+\.+\w+)/g, sub)
    // replace non dot notation
    .replace(/%(\w+)/g, sub)
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
        for (const tag of tags) {
          if (['titleTemplate', 'title'].includes(tag.tag) && typeof tag.textContent === 'string') {
            tag.textContent = processTemplateParams(tag.textContent, params)
          }
          else if (tag.tag === 'meta' && typeof tag.props.content === 'string') {
            tag.props.content = processTemplateParams(tag.props.content, params)
          }
          else if (tag.tag === 'script' && ['application/json', 'application/ld+json'].includes(tag.props.type) && typeof tag.innerHTML === 'string') {
            try {
              tag.innerHTML = JSON.stringify(JSON.parse(tag.innerHTML), (key, val) => {
                if (typeof val === 'string')
                  return processTemplateParams(val, params)
                return val
              })
            }
            catch {}
          }
        }
        ctx.tags = tags.filter(tag => tag.tag !== 'templateParams')
      },
    },
  })
}
