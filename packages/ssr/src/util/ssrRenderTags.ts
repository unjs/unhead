import type { HeadTag, RenderSSRHeadOptions } from '@unhead/schema'
import { propsToString, tagToString } from '.'

export function ssrRenderTags<T extends HeadTag>(tags: T[], options?: RenderSSRHeadOptions) {
  const schema: {
    tags: Record<'head' | 'bodyClose' | 'bodyOpen', string>
    htmlAttrs: HeadTag['props']
    bodyAttrs: HeadTag['props']
  } = { htmlAttrs: {}, bodyAttrs: {}, tags: { head: '', bodyClose: '', bodyOpen: '' } }

  const lineBreaks = !options?.omitLineBreaks ? '\n' : ''

  for (const tag of tags) {
    if (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs') {
      schema[tag.tag] = { ...schema[tag.tag], ...tag.props }
      continue
    }
    const s = tagToString(tag)
    const tagPosition = tag.tagPosition || 'head'
    schema.tags[tagPosition] += schema.tags[tagPosition]
      ? `${lineBreaks}${s}`
      : s
  }

  return {
    headTags: schema.tags.head,
    bodyTags: schema.tags.bodyClose,
    bodyTagsOpen: schema.tags.bodyOpen,
    htmlAttrs: propsToString(schema.htmlAttrs),
    bodyAttrs: propsToString(schema.bodyAttrs),
  }
}
