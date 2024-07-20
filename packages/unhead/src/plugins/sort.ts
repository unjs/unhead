import { SortModifiers, defineHeadPlugin, tagWeight } from '@unhead/shared'

export default defineHeadPlugin({
  hooks: {
    'tags:resolve': (ctx) => {
      // 2a. Sort based on priority
      // now we need to check render priority for each before: rule and use the dedupe key index
      for (const tag of ctx.tags) {
        if (typeof tag.tagPriority !== 'string') {
          continue
        }

        for (const { prefix, offset } of SortModifiers) {
          if (!tag.tagPriority.startsWith(prefix)) {
            continue
          }

          const key = (tag.tagPriority as string).substring(prefix.length)

          const position = ctx.tags.find(tag => tag._d === key)?._p

          if (position !== undefined) {
            tag._p = position + offset
            break
          }
        }
      }

      ctx.tags.sort((a, b) => {
        const aWeight = tagWeight(a)
        const bWeight = tagWeight(b)

        // 2c. sort based on critical tags
        if (aWeight < bWeight) {
          return -1
        }
        else if (aWeight > bWeight) {
          return 1
        }

        // 2b. sort tags in their natural order
        return a._p! - b._p!
      })
    },
  },
})
