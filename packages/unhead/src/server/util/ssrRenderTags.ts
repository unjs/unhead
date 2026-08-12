import type { HeadTag, RenderSSRHeadOptions } from '../../types'
import { propsToString, propsToStringTrusted } from './propsToString'
import { tagToString, tagToStringTrusted } from './tagToString'

/* @__PURE__ */
function renderTags<T extends HeadTag>(tags: T[], options: RenderSSRHeadOptions | undefined, trusted: boolean) {
  const schema: {
    tags: Record<'head' | 'bodyClose' | 'bodyOpen', string>
    htmlAttrs: HeadTag['props']
    bodyAttrs: HeadTag['props']
  } = { htmlAttrs: {}, bodyAttrs: {}, tags: { head: '', bodyClose: '', bodyOpen: '' } }

  const lineBreaks = !options?.omitLineBreaks ? '\n' : ''

  for (const tag of tags) {
    if (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs') {
      Object.assign(schema[tag.tag], tag.props)
      continue
    }
    const s = trusted ? tagToStringTrusted(tag) : tagToString(tag)
    const tagPosition = tag.tagPosition || 'head'
    schema.tags[tagPosition] += schema.tags[tagPosition]
      ? `${lineBreaks}${s}`
      : s
  }

  return {
    headTags: schema.tags.head,
    bodyTags: schema.tags.bodyClose,
    bodyTagsOpen: schema.tags.bodyOpen,
    htmlAttrs: trusted ? propsToStringTrusted(schema.htmlAttrs) : propsToString(schema.htmlAttrs),
    bodyAttrs: trusted ? propsToStringTrusted(schema.bodyAttrs) : propsToString(schema.bodyAttrs),
  }
}

/* @__PURE__ */
export function ssrRenderTags<T extends HeadTag>(tags: T[], options?: RenderSSRHeadOptions) {
  return renderTags(tags, options, false)
}

/** @internal */
/* @__PURE__ */
export function ssrRenderTagsTrusted<T extends HeadTag>(tags: T[], options?: RenderSSRHeadOptions) {
  return renderTags(tags, options, true)
}
