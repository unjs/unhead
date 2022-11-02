import { sortCriticalTags } from 'zhead'
import { defineHeadPlugin } from './defineHeadPlugin'

export const sortPlugin = defineHeadPlugin({
  hooks: {
    'tags:resolve': (ctx) => {
      const tagIndexForKey = (key: string) => ctx.tags.find(tag => tag._d === key)?._p
      // 2a. Sort based on priority
      // now we need to check render priority for each before: rule and use the dedupe key index
      for (const tag of ctx.tags) {
        if (!tag?.tagPriority)
          continue

        if (typeof tag.tagPriority === 'number') {
          tag._p = tag.tagPriority
          continue
        }

        const modifiers = [{ prefix: 'before:', offset: -1 }, { prefix: 'after:', offset: 1 }]
        for (const { prefix, offset } of modifiers) {
          if (tag.tagPriority.startsWith(prefix)) {
            const key = tag.tagPriority.replace(prefix, '')
            const index = tagIndexForKey(key)
            if (typeof index !== 'undefined')
              tag._p = index + offset
          }
        }
      }

      ctx.tags
        // 2b. sort tags in their natural order
        .sort((a, b) => a._p! - b._p!)
        // 2c. sort based on critical tags
        .sort(sortCriticalTags)
    },
  },
})
