import type { HeadTag } from '../types'
import { unpackMeta } from '../utils/meta'
import { defineHeadPlugin } from './defineHeadPlugin'

export const FlatMetaPlugin = /* @__PURE__ */ defineHeadPlugin({
  key: 'flatMeta',
  hooks: {
    'entries:normalize': (ctx) => {
      let hasFlatMeta = false
      const tags: HeadTag[] = []
      const tagsToAdd: HeadTag[] = []
      for (const t of ctx.tags) {
        if (t.tag !== '_flatMeta') {
          tags.push(t)
          continue
        }
        hasFlatMeta = true
        for (const attrs of unpackMeta(t.attrs))
          tagsToAdd.push({ ...t, tag: 'meta', attrs, props: attrs })
      }
      if (!hasFlatMeta)
        return
      for (const tag of tagsToAdd) tags.push(tag)
      ctx.tags = tags
    },
  },
})
