import { defineHeadPlugin } from '@unhead/shared'
import type { TemplateParams } from '@unhead/schema'

function processTemplateParams(s: string, config: TemplateParams) {
  // for each %<word> token replace it with the corresponding runtime config or an empty value
  function sub(token: string) {
    let val: string = ''
    if (['s', 'pageTitle'].includes(token))
      val = config.pageTitle as string
    // support . notation
    else if (token.includes('.'))
      // @ts-expect-error untyped
      val = token.split('.').reduce((acc, key) => acc[key] || '', config) as string
    return (val || config[token] || '') as string
  }

  // need to avoid replacing url encoded values
  let decoded = s
  try {
    decoded = decodeURI(s)
  }
  catch {}
  // find all tokens in decoded
  const tokens: string[] = (decoded.match(/%(\w+\.+\w+)|%(\w+)/g) || []).sort().reverse()
  // for each tokens, replace in the original string s
  tokens.forEach((token) => {
    s = s.replaceAll(token, sub(token.slice(1))).trim()
  })

  if (config.separator) {
    // avoid the title ending with a separator
    if (s.endsWith(config.separator))
      s = s.slice(0, -config.separator.length).trim()
    if (s.startsWith(config.separator))
      s = s.slice(config.separator.length).trim()
    // make sure we don't have two separators next to each other
    s = s.replace(new RegExp(`\\${config.separator}\\s*\\${config.separator}`, 'g'), config.separator)
  }
  return s
}
export function TemplateParamsPlugin() {
  return defineHeadPlugin((unhead) => {
    return {
      hooks: {
        'tags:resolve': (ctx) => {
          const { tags } = ctx
          // find templateParams
          const title = tags.find(tag => tag.tag === 'title')?.textContent
          const idx = tags.findIndex(tag => tag.tag === 'templateParams')
          // we always process params so we can substitute the title
          const params = idx !== -1 ? tags[idx].textContent as unknown as TemplateParams : {}
          if (idx !== -1) {
            // if the entry for the params was a server entry, then we need to save this within the payload
            unhead.state.templateParams = params
          }
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
    }
  })
}
