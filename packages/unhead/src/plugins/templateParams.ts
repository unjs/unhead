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
  return {
    key: 'template-params',
    hooks: {
      'tags:resolve': ({ tagMap, tags }) => {
        // we always process params so we can substitute the title
        // resolved tags are immutable: copy props before deriving params
        const params = { ...(tagMap.get('templateParams')?.props || {}) } as TemplateParams
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
        for (let i = 0; i < tags.length; i++) {
          const tag = tags[i]
          if (tag.processTemplateParams === false) {
            continue
          }
          const v = SupportedAttrs[tag.tag]
          if (v && typeof tag.props[v] === 'string') {
            const next = processTemplateParams(tag.props[v], params, sep)
            if (next !== tag.props[v])
              tags[i] = { ...tag, props: { ...tag.props, [v]: next } }
          }
          // everything else requires explicit opt-in
          else if (tag.processTemplateParams || tag.tag === 'titleTemplate' || tag.tag === 'title') {
            let replaced: HeadTag | undefined
            for (const p of contentAttrs) {
              if (typeof tag[p] === 'string') {
                const next = processTemplateParams(tag[p], params, sep, tag.tag === 'script' && typeof tag.props.type === 'string' && tag.props.type.endsWith('json'))
                if (next !== tag[p])
                  (replaced ??= { ...tag })[p] = next
              }
            }
            if (replaced)
              tags[i] = replaced
          }
        }
        // resolved template params
        head._templateParams = params
        head._separator = sep
      },
      'tags:afterResolve': ({ tags }) => {
        // we need to re-process in case the user had a function as the titleTemplate
        for (let i = 0; i < tags.length; i++) {
          const tag = tags[i]
          if (tag.tag === 'title' && typeof tag.textContent === 'string' && tag.processTemplateParams !== false) {
            const next = processTemplateParams(tag.textContent, head._templateParams!, head._separator!)
            if (next !== tag.textContent)
              tags[i] = { ...tag, textContent: next }
          }
        }
      },
    },
  }
})
