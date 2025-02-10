import { defineHeadPlugin, sortTags } from '../utils'

export const SortModifiers = [{ prefix: 'before:', offset: -1 }, { prefix: 'after:', offset: 1 }]

export const AliasSortingPlugin = /* @__PURE__ */ defineHeadPlugin({
  key: 'aliasSorting',
  hooks: {
    'tags:resolve': (ctx) => {
      let modified = false
      for (const tag of ctx.tags) {
        if (!tag.tagPriority) {
          continue
        }
        for (const { prefix, offset } of SortModifiers) {
          if (!String(tag.tagPriority).startsWith(prefix)) {
            continue
          }

          let key = (tag.tagPriority as string).substring(prefix.length)
          if (!key.includes(':key')) {
            key = key.replace('script:', 'script:key:')
          }

          const linkedTag = ctx.tagMap.get(key)
          if (linkedTag) {
            // we need to manually resort the tags at this point
            if (typeof linkedTag?.tagPriority === 'number') {
              tag.tagPriority = linkedTag.tagPriority
            }
            tag._p = linkedTag._p! + offset
            modified = true
          }
        }
      }
      if (modified) {
        // sort tags again
        ctx.tags = ctx.tags.sort(sortTags)
      }
    },
  },
})
