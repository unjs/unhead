import { defineHeadPlugin, SortModifiers, tagWeight } from '@unhead/shared'

const importRe = /@import/
const isTruthy = (val?: string | boolean) => val === '' || val === true

export default defineHeadPlugin(head => ({
  hooks: {
    // capo sorting
    'tags:beforeResolve': ({ tags }) => {
      if (!head.ssr || head.resolvedOptions.disableCapoSorting) {
        return
      }
      for (const tag of tags) {
        if (tag.tagPosition && tag.tagPosition !== 'head')
          continue
        tag.tagPriority = tag.tagPriority || tagWeight(tag)
        // skip if already prioritised
        if (tag.tagPriority !== 100)
          continue

        const isScript = tag.tag === 'script'
        const isLink = tag.tag === 'link'
        if (isScript && isTruthy(tag.props.async)) {
          // ASYNC_SCRIPT
          tag.tagPriority = 30
          // SYNC_SCRIPT
        }
        else if (tag.tag === 'style' && tag.innerHTML && importRe.test(tag.innerHTML)) {
          // IMPORTED_STYLES
          tag.tagPriority = 40
        }
        else if (isScript && tag.props.src && !isTruthy(tag.props.defer) && !isTruthy(tag.props.async) && tag.props.type !== 'module' && !tag.props.type?.endsWith('json')) {
          tag.tagPriority = 50
        }
        else if ((isLink && tag.props.rel === 'stylesheet') || tag.tag === 'style') {
          // SYNC_STYLES
          tag.tagPriority = 60
        }
        else if (isLink && (tag.props.rel === 'preload' || tag.props.rel === 'modulepreload')) {
          // PRELOAD
          tag.tagPriority = 70
        }
        else if (isScript && isTruthy(tag.props.defer) && tag.props.src && !isTruthy(tag.props.async)) {
          // DEFER_SCRIPT
          tag.tagPriority = 80
        }
        else if (isLink && (tag.props.rel === 'prefetch' || tag.props.rel === 'dns-prefetch' || tag.props.rel === 'prerender')) {
          tag.tagPriority = 90
        }
      }
    },
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
              tag.tagPriority = linkedTag.tagPriority + offset
            }
            else {
              tag._p = linkedTag._p! + offset
            }
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
}))
