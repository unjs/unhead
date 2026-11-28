import type { ResolvedHeadTag as HeadTag } from '../types'
import { unpackMeta } from '../utils/meta'
import { defineHeadPlugin } from './defineHeadPlugin'

export const FlatMetaPlugin = /* @__PURE__ */ defineHeadPlugin({
  key: 'flatMeta',
  hooks: {
    'entries:normalize': (ctx) => {
      const input = ctx.tags
      let tags: HeadTag[] | undefined
      let tagsToAdd: HeadTag[] | undefined
      for (let i = 0; i < input.length; i++) {
        const t = input[i]
        if (t.tag !== '_flatMeta') {
          tags?.push(t)
          continue
        }
        if (!tags) {
          tags = input.slice(0, i)
          tagsToAdd = []
        }
        for (const attrs of unpackMeta(t.attrs))
          tagsToAdd!.push({ ...t, tag: 'meta', attrs, props: attrs })
      }
      if (!tags)
        return
      for (let i = 0; i < tagsToAdd!.length; i++)
        tags.push(tagsToAdd![i])
      ctx.tags = tags
    },
  },
})
