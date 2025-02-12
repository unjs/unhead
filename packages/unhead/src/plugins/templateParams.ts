import type { HeadTag, TemplateParams } from '../types'
import { defineHeadPlugin, processTemplateParams } from '@unhead/shared'

const SupportedAttrs = {
  meta: 'content',
  link: 'href',
  htmlAttrs: 'lang',
} as const

const contentAttrs = ['innerHTML', 'textContent']

export const TemplateParamsPlugin = defineHeadPlugin(head => ({
  hooks: {
    'tags:resolve': (ctx) => {
      const { tags } = ctx
      let templateParams: TemplateParams | undefined
      for (let i = 0; i < tags.length; i += 1) {
        const tag = tags[i]

        if (tag.tag !== 'templateParams') {
          continue
        }

        templateParams = ctx.tags.splice(i, 1)[0].props

        i -= 1
      }
      // we always process params so we can substitute the title
      const params = (templateParams || {}) as TemplateParams
      // ensure a separator exists
      const sep = params.separator || '|'
      delete params.separator
      // pre-process title
      params.pageTitle = processTemplateParams(
        // find templateParams
        params.pageTitle as string || tags.find(tag => tag.tag === 'title')?.textContent || '',
        params,
        sep,
      )
      for (const tag of tags) {
        if (tag.processTemplateParams === false) {
          continue
        }
        // @ts-expect-error untyped
        const v = SupportedAttrs[tag.tag]
        if (v && typeof tag.props[v] === 'string') {
          tag.props[v] = processTemplateParams(tag.props[v], params, sep)
        }
        // everything else requires explicit opt-in
        else if (tag.processTemplateParams || tag.tag === 'titleTemplate' || tag.tag === 'title') {
          for (const p of contentAttrs) {
            // @ts-expect-error untyped
            if (typeof tag[p] === 'string')
              // @ts-expect-error untyped
              tag[p] = processTemplateParams(tag[p], params, sep, tag.tag === 'script' && tag.props.type.endsWith('json'))
          }
        }
      }
      // resolved template params
      head._templateParams = params
      head._separator = sep
    },
    'tags:afterResolve': ({ tags }) => {
      // we need to re-process in case then user had a function as the titleTemplate
      let title: HeadTag | undefined
      for (let i = 0; i < tags.length; i += 1) {
        const tag = tags[i]

        if (tag.tag === 'title' && tag.processTemplateParams !== false) {
          title = tag
        }
      }
      if (title?.textContent) {
        title.textContent = processTemplateParams(title.textContent, head._templateParams!, head._separator!)
      }
    },
  },
}))
