import {defineHeadPlugin} from "@unhead/shared";
import {TemplateVars} from "@unhead/schema";

function processTemplateVars(s: string, config: TemplateVars) {
  // for each %<word> token replace it with the corresponding runtime config or an empty value
  const replacer = (preserveToken?: boolean) => (_: unknown, token: string) => {
    if (token === 'pageTitle' || token === 's')
      return '%s'

    let val
    // support . notation
    if (token.includes('.')) {
      // @ts-expect-error untyped
      val = token.split('.').reduce((acc, key) => acc[key] || {}, config)
    }
    else {
      val = config[token]
    }
    return val || (preserveToken ? token : '')
  }
  let template = s
    .replace(/%(\w+\.?\w+)%/g, replacer())
    .replace(/%(\w+\.?\w+)/g, replacer(true))
    .trim()

  if (config.titleSeparator) {
    // avoid the title ending with a separator
    if (template.endsWith(config.titleSeparator))
      template = template.slice(0, -config.titleSeparator.length).trim()
    if (template.startsWith(config.titleSeparator))
      template = template.slice(config.titleSeparator.length).trim()
  }
  return template
}
export function TemplatesVarsPlugin() {
  return defineHeadPlugin({
    hooks: {
      'tags:resolve': (ctx) => {
        // find templateVars
        const templateVarsIdx = ctx.tags.findIndex((tag) => tag.tag === 'templateVars')

        if (templateVarsIdx !== -1) {
          const templateVars = ctx.tags[templateVarsIdx].templateVars
          ctx.tags = ctx.tags.splice(templateVarsIdx, 1)

          if (!templateVars)
            return

          for (const tag of ctx.tags) {
            if (['titleTemplate', 'title'].includes(tag.tag) && typeof tag.children === 'string')
              tag.children = processTemplateVars(tag.children, templateVars)
            if (tag.tag === 'meta' && typeof tag.props.content === 'string')
              tag.props.content = processTemplateVars(tag.props.content, templateVars)
          }
        }
      }
    }
  })
}
