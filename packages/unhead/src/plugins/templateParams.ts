import type { HeadTag, TemplateParams } from '../types/tags'
import { processTemplateParams } from '../utils'
import { defineHeadPlugin } from './defineHeadPlugin'

const SupportedAttrs = {
  meta: 'content',
  link: 'href',
  htmlAttrs: 'lang',
} as const

const contentAttrs = ['innerHTML', 'textContent']

export const TemplateParamsPlugin = /* @__PURE__ */ defineHeadPlugin((head) => {
  return {
    key: 'template-params',
    hooks: {
      'tags:resolve': ({ tagMap, tags }) => {
        // we always process params so we can substitute the title
        const params = (tagMap.get('templateParams')?.props || {}) as TemplateParams
        // ensure a separator exists
        const sep = params.separator || '|'
        delete params.separator
        // pre-process title
        params.pageTitle = processTemplateParams(
          // find templateParams
          params.pageTitle as string || head._title || '',
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
      'tags:afterResolve': ({ tagMap }) => {
        // we need to re-process in case then user had a function as the titleTemplate
        const title: HeadTag | undefined = tagMap.get('title')
        if (title?.textContent && title.processTemplateParams !== false) {
          title.textContent = processTemplateParams(title.textContent, head._templateParams!, head._separator!)
        }
      },
    },
  }
})
