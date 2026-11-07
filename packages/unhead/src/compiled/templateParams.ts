import type { CompiledTagsHead, RuntimeTag } from './core'
import { processTemplateParams } from '../utils/templateParams'
import { copyValue } from './tags'

/**
 * The `TemplateParamsPlugin` rules without hooks, for the strict head. Tags may
 * be shared with the compiled tags, so a tag is only copied when a value changes, and the
 * params that become `head._templateParams` are a deep copy.
 */
export function applyTemplateParams(tags: RuntimeTag[], tagMap: Map<string, any>, head: CompiledTagsHead): void {
  const params: Record<string, any> = copyValue(tagMap.get('templateParams')?.props || {})
  const sep = params.separator || '|'
  delete params.separator
  params.pageTitle = processTemplateParams(params.pageTitle || head._title || '', params, sep)
  let title = tagMap.get('title')
  for (let i = 0; i < tags.length; i++) {
    let tag = tags[i]!
    if (tag.processTemplateParams === false)
      continue
    const name = tag.tag
    const attr = name === 'meta' ? 'content' : name === 'link' ? 'href' : name === 'htmlAttrs' ? 'lang' : ''
    let next: RuntimeTag | undefined
    if (attr && typeof tag.props[attr] === 'string') {
      const value = processTemplateParams(tag.props[attr], params, sep)
      if (value !== tag.props[attr])
        next = { ...tag, props: { ...tag.props, [attr]: value } }
    }
    else if (tag.processTemplateParams || name === 'titleTemplate' || name === 'title') {
      const json = name === 'script' && typeof tag.props.type === 'string' && tag.props.type.endsWith('json')
      for (const key of ['innerHTML', 'textContent']) {
        const value = processTemplateParams(tag[key], params, sep, json)
        if (value !== tag[key])
          tag = next = { ...tag, [key]: value }
      }
    }
    if (next) {
      if (title === tags[i])
        title = next
      tags[i] = next
    }
  }
  if (title?.textContent && title.processTemplateParams !== false) {
    const value = processTemplateParams(title.textContent, params, sep)
    if (value !== title.textContent)
      tags[tags.indexOf(title)] = { ...title, textContent: value }
  }
  head._templateParams = params
  head._separator = sep
}
