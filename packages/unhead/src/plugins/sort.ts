import { defineHeadPlugin, SortModifiers, tagWeight } from '@unhead/shared'

export const SortPlugin = defineHeadPlugin(head => ({
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

          const linkedTag = ctx.tags.find(tag => tag._d === key)
          if (linkedTag) {
            if (typeof linkedTag?.tagPriority === 'number') {
              tag.tagPriority = linkedTag.tagPriority
            }
            tag._p = linkedTag._p! + offset
            break
          }
        }
      }

      ctx.tags.sort((a, b) => {
        const aWeight = tagWeight(head, a)
        const bWeight = tagWeight(head, b)

        // 2c. sort based on critical tags
        if (aWeight !== bWeight) {
          return aWeight - bWeight
        }

        // 2b. sort tags in their natural order
        return a._p! - b._p!
      })
    },
  },
}))
