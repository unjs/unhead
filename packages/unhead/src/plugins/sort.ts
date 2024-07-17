import { SortModifiers, defineHeadPlugin, tagWeight } from '@unhead/shared'

export default defineHeadPlugin({
  hooks: {
    'tags:resolve': (ctx) => {
      const tagPositionForKey = (key: string) => ctx.tags.find(tag => tag._d === key)?._p

      // 2a. Sort based on priority
      // now we need to check render priority for each before: rule and use the dedupe key index
      for (const { prefix, offset } of SortModifiers) {
        for (const tag of ctx.tags) {
          if (typeof tag.tagPriority !== 'string' || !tag.tagPriority!.startsWith(prefix)) {
            continue
          }

          const position = tagPositionForKey(
            (tag.tagPriority as string).substring(prefix.length),
          )
          if (position !== undefined)
            tag._p = position + offset
        }
      }

      ctx.tags
        // 2b. sort tags in their natural order
        .sort((a, b) => a._p! - b._p!)
        // 2c. sort based on critical tags
        .sort((a, b) => tagWeight(a) - tagWeight(b))
    },
  },
})
