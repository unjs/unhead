import { defineHeadPlugin, processTemplateParams } from '@unhead/shared'
import type { TemplateParams } from '@unhead/schema'

const SupportedAttrs = {
  meta: 'content',
  link: 'href',
  htmlAttrs: 'lang',
} as const

export default defineHeadPlugin(head => ({
  hooks: {
    'tags:resolve': (ctx) => {
      const { tags } = ctx
      // find templateParams
      const title = tags.find(tag => tag.tag === 'title')?.textContent
      const idx = tags.findIndex(tag => tag.tag === 'templateParams')
      // we always process params so we can substitute the title
      const params = idx !== -1 ? tags[idx].props as unknown as TemplateParams : {}
      // ensure a separator exists
      const sep = params.separator || '|'
      delete params.separator
      // pre-process title
      params.pageTitle = processTemplateParams(params.pageTitle as string || title || '', params, sep)
      for (const tag of tags.filter(t => t.processTemplateParams !== false)) {
        // @ts-expect-error untyped
        const v = SupportedAttrs[tag.tag]
        if (v && typeof tag.props[v] === 'string') {
          tag.props[v] = processTemplateParams(tag.props[v], params, sep)
        }
        // everything else requires explicit opt-in
        else if (tag.processTemplateParams === true || tag.tag === 'titleTemplate' || tag.tag === 'title') {
          ['innerHTML', 'textContent'].forEach((p) => {
            // @ts-expect-error untyped
            if (typeof tag[p] === 'string')
              // @ts-expect-error untyped
              tag[p] = processTemplateParams(tag[p], params, sep)
          })
        }
      }
      // resolved template params
      head._templateParams = params
      head._separator = sep
      ctx.tags = tags.filter(tag => tag.tag !== 'templateParams')
    },
  },
}))
