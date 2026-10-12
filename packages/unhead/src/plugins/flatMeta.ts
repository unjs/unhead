import type { HeadEntry, HeadTag, MetaFlat } from '../types'
import { unpackMeta } from '../utils/meta'
import { defineHeadPlugin } from './defineHeadPlugin'

export const FlatMetaPlugin = /* @__PURE__ */ defineHeadPlugin({
  key: 'flatMeta',
  hooks: {
    'entries:normalize': <Input>(ctx: { tags: HeadTag[], entry: HeadEntry<Input> }) => {
      let hasFlatMeta = false
      const tags: HeadTag[] = []
      const tagsToAdd: HeadTag[] = []
      for (const t of ctx.tags) {
        if (t.tag !== '_flatMeta') {
          tags.push(t)
          continue
        }
        hasFlatMeta = true
        for (const props of unpackMeta(t.props as unknown as MetaFlat)) {
          // Resolved tag props are stringified by the renderers; `UnheadMeta`
          // still carries its public input types (notably number/null content).
          tagsToAdd.push({ ...t, tag: 'meta', props: props as unknown as HeadTag['props'] })
        }
      }
      if (!hasFlatMeta)
        return
      for (const tag of tagsToAdd) tags.push(tag)
      ctx.tags = tags
    },
  },
})
