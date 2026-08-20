import type { HeadTag, TemplateParams } from '../types/tags'
import { processTemplateParams } from '../utils'
import { defineHeadPlugin } from './defineHeadPlugin'

const SupportedAttrs: Partial<Record<string, string>> = {
  meta: 'content',
  link: 'href',
  htmlAttrs: 'lang',
}

const contentAttrs: (keyof Pick<HeadTag, 'innerHTML' | 'textContent'>)[] = ['innerHTML', 'textContent']

function processIfNeeded(value: string, params: TemplateParams, separator: string, isJson = false) {
  return typeof value === 'string' && value.includes('%')
    ? processTemplateParams(value, params, separator, isJson)
    : value
}

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
        params.pageTitle = processIfNeeded(
          // find templateParams
          params.pageTitle as string || head._title || '',
          params,
          sep,
        )
        for (const tag of tags) {
          if (tag.processTemplateParams === false) {
            continue
          }
          const v = SupportedAttrs[tag.tag]
          if (v && typeof tag.props[v] === 'string') {
            tag.props[v] = processIfNeeded(tag.props[v], params, sep)
          }
          // everything else requires explicit opt-in
          else if (tag.processTemplateParams || tag.tag === 'titleTemplate' || tag.tag === 'title') {
            for (const p of contentAttrs) {
              if (typeof tag[p] === 'string')
                tag[p] = processIfNeeded(tag[p], params, sep, tag.tag === 'script' && typeof tag.props.type === 'string' && tag.props.type.endsWith('json'))
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
          title.textContent = processIfNeeded(title.textContent, head._templateParams!, head._separator!)
        }
      },
    },
  }
}, 'template-params')
