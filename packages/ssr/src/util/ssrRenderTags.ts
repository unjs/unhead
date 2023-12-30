import type { HeadTag, SSRHeadOptions } from '@unhead/schema'
import { propsToString, tagToString } from '.'

export function ssrRenderTags<T extends HeadTag>(tags: T[], options?: SSRHeadOptions) {
  const schema: {
    tags: Record<'head' | 'bodyClose' | 'bodyOpen', string[]>
    htmlAttrs: HeadTag['props']
    bodyAttrs: HeadTag['props']
  } = { htmlAttrs: {}, bodyAttrs: {}, tags: { head: [], bodyClose: [], bodyOpen: [] } }

  for (const tag of tags) {
    if (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs') {
      schema[tag.tag] = { ...schema[tag.tag], ...tag.props }
      continue
    }
    schema.tags[tag.tagPosition || 'head'].push(tagToString(tag))
  }

  const lineBreaks = !options?.omitLineBreaks ? '\n' : ''

  return {
    headTags: schema.tags.head.join(lineBreaks),
    bodyTags: schema.tags.bodyClose.join(lineBreaks),
    bodyTagsOpen: schema.tags.bodyOpen.join(lineBreaks),
    htmlAttrs: propsToString(schema.htmlAttrs),
    bodyAttrs: propsToString(schema.bodyAttrs),
  }
}
