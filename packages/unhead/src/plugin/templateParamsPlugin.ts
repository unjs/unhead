import { defineHeadPlugin } from '@unhead/shared'
import type { TemplateParams } from '@unhead/schema'

export function processTemplateParams(s: string, config: TemplateParams) {
  // for each %<word> token replace it with the corresponding runtime config or an empty value
  function sub(token: string) {
    if (['s', 'pageTitle'].includes(token))
      return config.pageTitle as string
    let val: string | undefined
    // support . notation
    if (token.includes('.')) {
      // @ts-expect-error untyped
      val = token.split('.').reduce((acc, key) => acc ? (acc[key] || undefined) : undefined, config) as string
    }
    else { val = config[token] as string | undefined }
    return typeof val !== 'undefined' ? (val || '') : false
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
    const re = sub(token.slice(1))
    if (typeof re === 'string') {
      // replace the re using regex as word seperators
      s = s.replace(new RegExp(`\\${token}(\\W|$)`, 'g'), `${re}$1`).trim()
    }
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
  return defineHeadPlugin({
    hooks: {
      'tags:resolve': (ctx) => {
        const { tags } = ctx
        // find templateParams
        const title = tags.find(tag => tag.tag === 'title')?.textContent
        const idx = tags.findIndex(tag => tag.tag === 'templateParams')
        // we always process params so we can substitute the title
        const params = idx !== -1 ? tags[idx].props as unknown as TemplateParams : {}
        // pre-process title
        params.pageTitle = processTemplateParams(params.pageTitle as string || title || '', params)
        for (const tag of tags) {
          if (['titleTemplate', 'title'].includes(tag.tag) && typeof tag.textContent === 'string') {
            tag.textContent = processTemplateParams(tag.textContent, params)
          }
          else if (tag.tag === 'meta' && typeof tag.props.content === 'string') {
            tag.props.content = processTemplateParams(tag.props.content, params)
          }
          else if (tag.tag === 'link' && typeof tag.props.href === 'string') {
            tag.props.href = processTemplateParams(tag.props.href, params)
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
