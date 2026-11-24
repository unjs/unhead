import type { HeadTag, TemplateParams } from '../types/tags'
import { processTemplateParams } from '../utils'
import { defineHeadPlugin } from './defineHeadPlugin'

const SupportedAttrs = {
  meta: 'content',
  link: 'href',
  htmlAttrs: 'lang',
} as const

const contentAttrs = ['innerHTML', 'textContent']

const isJsonScript = (tag: HeadTag) => tag.tag === 'script' && String(tag.props.type).endsWith('json')

// A useHeadSafe() title may fill text and attribute values that stay text. In a script,
// a style, a URL or an `http-equiv` directive it would change page behaviour.
function takesSafeTitle(tag: HeadTag): boolean {
  if (tag.tag === 'meta')
    return !tag.props['http-equiv']
  return tag.tag === 'title' || tag.tag === 'titleTemplate' || tag.tag === 'htmlAttrs' || isJsonScript(tag)
}

export const TemplateParamsPlugin = /* @__PURE__ */ defineHeadPlugin((head) => {
  return {
    key: 'template-params',
    hooks: {
      'entries:normalize': (ctx) => {
        // Template parameters fill app scripts and directives, so untrusted input cannot set them.
        if (ctx.entry.options?._safe)
          return
        const params = ctx.tags.filter(t => t.tag === 'templateParams' && t.mode === 'server')?.[0]?.props || {}
        if (Object.keys(params).length) {
          head._ssrPayload = {
            templateParams: {
              ...head._ssrPayload?.templateParams || {},
              ...params,
            },
          }
        }
      },
      'tags:resolve': ({ tagMap, tags }) => {
        // we always process params so we can substitute the title
        const params = (tagMap.get('templateParams')?.props || {}) as TemplateParams
        // ensure a separator exists
        const sep = params.separator || '|'
        delete params.separator
        const safeTitle = !params.pageTitle && (tagMap.get('title') as HeadTag & { _safe?: boolean } | undefined)?._safe
        // pre-process title
        params.pageTitle = processTemplateParams(
          // find templateParams
          params.pageTitle as string || head._title || '',
          params,
          sep,
        )
        const withoutSafeTitle = safeTitle ? { ...params, pageTitle: '' } : params
        for (const tag of tags) {
          if (tag.processTemplateParams === false) {
            continue
          }
          const tagParams = takesSafeTitle(tag) ? params : withoutSafeTitle
          // @ts-expect-error untyped
          const v = SupportedAttrs[tag.tag]
          if (v && typeof tag.props[v] === 'string') {
            tag.props[v] = processTemplateParams(tag.props[v], tagParams, sep)
          }
          // everything else requires explicit opt-in
          else if (tag.processTemplateParams || tag.tag === 'titleTemplate' || tag.tag === 'title') {
            for (const p of contentAttrs) {
              // @ts-expect-error untyped
              if (typeof tag[p] === 'string')
                // @ts-expect-error untyped
                tag[p] = processTemplateParams(tag[p], tagParams, sep, isJsonScript(tag))
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
