import type { HeadTag } from '../types'
import { defineHeadPlugin } from '../utils/defineHeadPlugin'
import { unpackMeta } from '../utils/meta'

export const FlatMetaPlugin = /* @__PURE__ */ defineHeadPlugin({
  key: 'flatMeta',
  hooks: {
    'entries:normalize': (ctx) => {
      const tagsToAdd: HeadTag[] = []
      ctx.tags = ctx.tags.map((t) => {
        // @ts-expect-error untyped
        if (t.tag !== '_flatMeta') {
          return t
        }
        // @ts-expect-error untyped
        tagsToAdd.push(unpackMeta(t.props).map(p => ({
          ...t,
          tag: 'meta',
          props: p,
        })))
        return false
      })
        .filter(Boolean)
        .concat(...tagsToAdd) as HeadTag[]
    },
  },
})
