import { defineHeadPlugin, processTemplateParams } from '@unhead/shared'
import type { TemplateParams } from '@unhead/schema'

export default defineHeadPlugin({
  hooks: {
    'tags:resolve': (ctx) => {
      const { tags } = ctx
      // find templateParams
      const title = tags.find(tag => tag.tag === 'title')?.textContent
      const idx = tags.findIndex(tag => tag.tag === 'templateParams')
      // we always process params so we can substitute the title
      const params = idx !== -1 ? tags[idx].props as unknown as TemplateParams : {}
      // ensure a separator exists
      params.separator = params.separator || '|'
      // pre-process title
      params.pageTitle = processTemplateParams(params.pageTitle as string || title || '', params)
      for (const tag of tags) {
        if (['titleTemplate', 'title'].includes(tag.tag) && typeof tag.textContent === 'string')
          tag.textContent = processTemplateParams(tag.textContent, params)
        else if (tag.tag === 'meta' && typeof tag.props.content === 'string')
          tag.props.content = processTemplateParams(tag.props.content, params)
        else if (tag.tag === 'link' && typeof tag.props.href === 'string')
          tag.props.href = processTemplateParams(tag.props.href, params)
        else if (tag.tag === 'script' && ['application/json', 'application/ld+json'].includes(tag.props.type) && tag.innerHTML)
          tag.innerHTML = processTemplateParams(tag.innerHTML, params)
      }
      ctx.tags = tags.filter(tag => tag.tag !== 'templateParams')
    },
  },
})
