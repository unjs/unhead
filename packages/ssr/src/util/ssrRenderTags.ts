import type { HeadTag } from '@unhead/schema'
import { propsToString, tagToString } from '.'

export function ssrRenderTags<T extends HeadTag>(tags: T[]) {
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

  return {
    headTags: schema.tags.head.join('\n'),
    bodyTags: schema.tags.bodyClose.join('\n'),
    bodyTagsOpen: schema.tags.bodyOpen.join('\n'),
    htmlAttrs: propsToString(schema.htmlAttrs),
    bodyAttrs: propsToString(schema.bodyAttrs),
  }
}
