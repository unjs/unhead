import type { HeadTag, RenderSSRHeadOptions } from '../../types'
import { STATIC_BODY_ATTRS_TAG, STATIC_HTML_ATTRS_TAG } from '../staticPlanTags'
import { propsToString } from './propsToString'
import { tagToString } from './tagToString'

/* @__PURE__ */
export function ssrRenderTags<T extends HeadTag>(tags: T[], options?: RenderSSRHeadOptions) {
  const schema: {
    tags: Record<'head' | 'bodyClose' | 'bodyOpen', string>
    htmlAttrs: HeadTag['props']
    bodyAttrs: HeadTag['props']
    htmlAttrsRaw: string
    bodyAttrsRaw: string
  } = { htmlAttrs: {}, bodyAttrs: {}, htmlAttrsRaw: '', bodyAttrsRaw: '', tags: { head: '', bodyClose: '', bodyOpen: '' } }

  const lineBreaks = !options?.omitLineBreaks ? '\n' : ''

  for (const tag of tags) {
    // static plan attrs rows (see `pushStaticPlan`): already a rendered attr
    // string fragment, append rather than merge into the props object.
    if (tag.tag === STATIC_HTML_ATTRS_TAG) {
      schema.htmlAttrsRaw += tag._html || ''
      continue
    }
    if (tag.tag === STATIC_BODY_ATTRS_TAG) {
      schema.bodyAttrsRaw += tag._html || ''
      continue
    }
    if (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs') {
      Object.assign(schema[tag.tag], tag.props)
      continue
    }
    const s = tag._html !== undefined ? tag._html : tagToString(tag)
    const tagPosition = tag.tagPosition || 'head'
    schema.tags[tagPosition] += schema.tags[tagPosition]
      ? `${lineBreaks}${s}`
      : s
  }

  return {
    headTags: schema.tags.head,
    bodyTags: schema.tags.bodyClose,
    bodyTagsOpen: schema.tags.bodyOpen,
    htmlAttrs: propsToString(schema.htmlAttrs) + schema.htmlAttrsRaw,
    bodyAttrs: propsToString(schema.bodyAttrs) + schema.bodyAttrsRaw,
  }
}
