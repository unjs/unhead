import type { HeadTag, TemplateParams } from '../types/tags'
import { processTemplateParams } from '../utils'
import { defineHeadPlugin } from './defineHeadPlugin'

const SupportedAttrs: Partial<Record<string, string>> = {
  meta: 'content',
  link: 'href',
  htmlAttrs: 'lang',
}

const contentAttrs: (keyof Pick<HeadTag, 'innerHTML' | 'textContent'>)[] = ['innerHTML', 'textContent']

const isJsonScript = (tag: HeadTag) => tag.tag === 'script' && String(tag.props.type).endsWith('json')

// A useHeadSafe() title may fill text and attribute values that stay text. In a script,
// a style, a URL, an `http-equiv` directive or the referrer policy it would change page
// behaviour, so those keep `%s` and `%pageTitle` as written.
function takesSafeTitle(tag: HeadTag): boolean {
  if (tag.tag === 'meta')
    return !tag.props['http-equiv'] && String(tag.props.name).toLowerCase() !== 'referrer'
  return tag.tag === 'title' || tag.tag === 'titleTemplate' || tag.tag === 'htmlAttrs' || isJsonScript(tag)
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
        const safeTitle = !params.pageTitle && head._titleSafe
        // pre-process title
        params.pageTitle = processTemplateParams(
          // find templateParams
          params.pageTitle as string || head._title || '',
          params,
          sep,
        )
        let withoutSafeTitle = params
        if (safeTitle) {
          // Unresolved tokens stay as written. Blanking would change URL structure, such as `/%s/host` into `//host`.
          withoutSafeTitle = { ...params }
          delete withoutSafeTitle.pageTitle
        }
        for (const tag of tags) {
          if (tag.processTemplateParams === false) {
            continue
          }
          const v = SupportedAttrs[tag.tag]
          if (v && typeof tag.props[v] === 'string') {
            if (tag.props[v].includes('%')) {
              const tagParams = safeTitle && !takesSafeTitle(tag) ? withoutSafeTitle : params
              tag.props[v] = processTemplateParams(tag.props[v], tagParams, sep)
            }
          }
          // everything else requires explicit opt-in
          else if (tag.processTemplateParams || tag.tag === 'titleTemplate' || tag.tag === 'title') {
            let tagParams: TemplateParams | undefined
            for (const p of contentAttrs) {
              const content = tag[p]
              if (typeof content === 'string' && content.includes('%')) {
                tagParams ??= safeTitle && !takesSafeTitle(tag) ? withoutSafeTitle : params
                tag[p] = processTemplateParams(content, tagParams, sep, isJsonScript(tag))
              }
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
        if (title?.textContent && title.processTemplateParams !== false && title.textContent.includes('%')) {
          title.textContent = processTemplateParams(title.textContent, head._templateParams!, head._separator!)
        }
      },
    },
  }
}, 'template-params')
