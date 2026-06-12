import type { HeadTag } from '../types'
import { defineHeadPlugin } from './defineHeadPlugin'

// @ts-expect-error untyped
const sortTags = (a: HeadTag, b: HeadTag) => a._w === b._w ? a._p - b._p : a._w - b._w

const formatKey = (k: string) => !k.includes(':key') ? k.split(':').join(':key:') : k

export const AliasSortingPlugin = defineHeadPlugin({
  key: 'aliasSorting',
  hooks: {
    'tags:resolve': (ctx) => {
      let m = false
      const tags = ctx.tags
      for (let i = 0; i < tags.length; i++) {
        const t = tags[i]
        const p = t.tagPriority
        if (!p)
          continue
        const s = String(p)
        const before = s.startsWith('before:')
        if (!before && !s.startsWith('after:'))
          continue
        const k = formatKey(s.slice(before ? 7 : 6))
        const l = ctx.tagMap.get(k)
        if (l) {
          // resolved tags are immutable: re-anchor via a replacement object
          const next = { ...t, _p: l._p! + (before ? -1 : 1) }
          if (typeof l.tagPriority === 'number')
            next.tagPriority = l.tagPriority
          tags[i] = next
          m = true
        }
      }
      if (m)
        ctx.tags = tags.sort(sortTags)
    },
  },
})
