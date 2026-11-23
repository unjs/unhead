import type { HeadTag, TemplateParams } from '../types/tags'
import { processTemplateParams } from '../utils'
import { defineHeadPlugin } from './defineHeadPlugin'

const SupportedAttrs: Partial<Record<string, string>> = {
  meta: 'content',
  link: 'href',
  htmlAttrs: 'lang',
}

const contentAttrs: (keyof Pick<HeadTag, 'innerHTML' | 'textContent'>)[] = ['innerHTML', 'textContent']

export const TemplateParamsPlugin = /* @__PURE__ */ defineHeadPlugin((head) => {
  let textParams: TemplateParams | undefined
  return {
    key: 'template-params',
    hooks: {
      'tags:resolve': ({ tagMap, tags }) => {
        // we always process params so we can substitute the title
        const params = (tagMap.get('templateParams')?.props || {}) as TemplateParams
        // ensure a separator exists
        const sep = params.separator || '|'
        delete params.separator
        const safeTitle = !params.pageTitle && tagMap.get('title')?._safe
        const pageTitle = processTemplateParams(params.pageTitle as string || head._title || '', params, sep)
        // Safe titles are display text. Keep them out of directives, URLs, and raw content.
        textParams = safeTitle ? { ...params, pageTitle } : params
        params.pageTitle = safeTitle ? '' : pageTitle
        for (const tag of tags) {
          if (tag.processTemplateParams === false) {
            continue
          }
          const v = SupportedAttrs[tag.tag]
          if (v && typeof tag.props[v] === 'string') {
            const active = tag.tag === 'link' || (tag.tag === 'meta' && 'http-equiv' in tag.props)
            tag.props[v] = processTemplateParams(tag.props[v], active ? params : textParams, sep)
          }
          // everything else requires explicit opt-in
          else if (tag.processTemplateParams || tag.tag === 'titleTemplate' || tag.tag === 'title') {
            const contentParams = tag.tag === 'titleTemplate' || tag.tag === 'title' ? textParams : params
            for (const p of contentAttrs) {
              if (typeof tag[p] === 'string')
                tag[p] = processTemplateParams(tag[p], contentParams, sep, tag.tag === 'script' && String(tag.props.type).endsWith('json'))
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
        if (title?.textContent && textParams && title.processTemplateParams !== false) {
          title.textContent = processTemplateParams(title.textContent, textParams, head._separator!)
        }
      },
    },
  }
}, 'template-params')
