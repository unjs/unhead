import type { HeadTag } from '../types'
import { unpackMeta } from '../utils/meta'
import { defineHeadPlugin } from './defineHeadPlugin'

export const FlatMetaPlugin = /* @__PURE__ */ defineHeadPlugin({
  key: 'flatMeta',
  hooks: {
    'entries:normalize': (ctx) => {
      const tagsToAdd: HeadTag[] = []
      ctx.tags = ctx.tags.map((t: HeadTag) => {
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
