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
      for (const t of ctx.tags) {
        const p = t.tagPriority
        if (!p)
          continue
        const s = String(p)
        if (s.startsWith('before:')) {
          const k = formatKey(s.slice(7))
          const l = ctx.tagMap.get(k)
          if (l) {
            if (typeof l.tagPriority === 'number')
              t.tagPriority = l.tagPriority
            t._p = l._p! - 1
            m = true
          }
        }
        else if (s.startsWith('after:')) {
          const k = formatKey(s.slice(6))
          const l = ctx.tagMap.get(k)
          if (l) {
            if (typeof l.tagPriority === 'number')
              t.tagPriority = l.tagPriority
            t._p = l._p! + 1
            m = true
          }
        }
      }
      if (m)
        ctx.tags = ctx.tags.sort(sortTags)
    },
  },
})
