import type { PolicySlot } from '../../parser/policy'
import type { HeadTag, RenderSSRHeadOptions } from '../../types'
import { policyIdentity, rememberRenderedPolicies } from '../../parser/policy'
import { rootPropsToString } from './propsToString'
import { tagToString } from './tagToString'

/* @__PURE__ */
export function ssrRenderTags<T extends HeadTag>(tags: T[], options?: RenderSSRHeadOptions) {
  const schema: {
    tags: Record<'head' | 'bodyClose' | 'bodyOpen', string>
    htmlAttrs: HeadTag['props']
    bodyAttrs: HeadTag['props']
  } = { htmlAttrs: {}, bodyAttrs: {}, tags: { head: '', bodyClose: '', bodyOpen: '' } }

  const lineBreaks = !options?.omitLineBreaks ? '\n' : ''
  let policies: PolicySlot[] | undefined

  for (const tag of tags) {
    if (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs') {
      Object.assign(schema[tag.tag], tag.props)
      continue
    }
    const s = tagToString(tag)
    const tagPosition = tag.tagPosition || 'head'
    const previous = schema.tags[tagPosition]
    schema.tags[tagPosition] = previous
      ? `${previous}${lineBreaks}${s}`
      : s
    if (tag.tag === 'meta' && tagPosition === 'head') {
      const identity = policyIdentity(tag)
      if (identity) {
        const start = previous ? previous.length + lineBreaks.length : 0
        ;(policies ||= []).push({ identity, start, end: start + s.length })
      }
    }
  }

  const output = {
    headTags: schema.tags.head,
    bodyTags: schema.tags.bodyClose,
    bodyTagsOpen: schema.tags.bodyOpen,
    htmlAttrs: rootPropsToString(schema.htmlAttrs),
    bodyAttrs: rootPropsToString(schema.bodyAttrs),
  }
  if (policies)
    rememberRenderedPolicies(output, policies)
  return output
}
