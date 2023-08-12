import type { HeadTag } from '@unhead/schema'
import { HasElementTags, defineHeadPlugin, tagDedupeKey, tagWeight } from '@unhead/shared'

const UsesMergeStrategy = ['templateParams', 'htmlAttrs', 'bodyAttrs']

export default defineHeadPlugin({
  hooks: {
    'tag:normalise': function ({ tag }) {
      // support for third-party dedupe keys
      ['hid', 'vmid', 'key'].forEach((key) => {
        if (tag.props[key]) {
          tag.key = tag.props[key]
          delete tag.props[key]
        }
      })
      const generatedKey = tagDedupeKey(tag)
      const dedupe = generatedKey || (tag.key ? `${tag.tag}:${tag.key}` : false)
      if (dedupe)
        tag._d = dedupe
    },
    'tags:resolve': function (ctx) {
      // 1. Dedupe tags
      const deduping: Record<string, HeadTag> = {}
      ctx.tags.forEach((tag) => {
        // need a seperate dedupe key other than _d
        const dedupeKey = (tag.key ? `${tag.tag}:${tag.key}` : tag._d) || tag._p!
        const dupedTag: HeadTag = deduping[dedupeKey]
        // handling a duplicate tag
        if (dupedTag) {
          // default strategy is replace, unless we're dealing with a html or body attrs
          let strategy = tag?.tagDuplicateStrategy
          if (!strategy && UsesMergeStrategy.includes(tag.tag))
            strategy = 'merge'

          if (strategy === 'merge') {
            const oldProps = dupedTag.props
            // apply oldProps to current props
            ;['class', 'style'].forEach((key) => {
              if (tag.props[key] && oldProps[key]) {
                // ensure style merge doesn't result in invalid css
                if (key === 'style' && !oldProps[key].endsWith(';'))
                  oldProps[key] += ';'

                tag.props[key] = `${oldProps[key]} ${tag.props[key]}`
              }
            })
            deduping[dedupeKey].props = {
              ...oldProps,
              ...tag.props,
            }
            return
          }
          else if (tag._e === dupedTag._e) {
            // add the duped tag to the current tag
            // @ts-expect-error runtime type
            dupedTag._duped = dupedTag._duped || []
            // @ts-expect-error runtime type
            tag._d = `${dupedTag._d}:${dupedTag._duped.length + 1}`
            // @ts-expect-error runtime type
            dupedTag._duped.push(tag)
            return
          }
          else if (tagWeight(tag) > tagWeight(dupedTag)) {
            // check tag weights
            return
          }
        }
        const propCount = Object.keys(tag.props).length + (tag.innerHTML ? 1 : 0) + (tag.textContent ? 1 : 0)
        // if the new tag does not have any props, we're trying to remove the duped tag from the DOM
        if (HasElementTags.includes(tag.tag) && propCount === 0) {
          // find the tag with the same key
          delete deduping[dedupeKey]
          return
        }
        // make sure the tag we're replacing has a lower tag weight
        deduping[dedupeKey] = tag
      })
      const newTags: HeadTag[] = []
      Object.values(deduping).forEach((tag) => {
        // @ts-expect-error runtime type
        const dupes = tag._duped
        // @ts-expect-error runtime type
        delete tag._duped
        newTags.push(tag)
        // add the duped tags to the new tags
        if (dupes)
          newTags.push(...dupes)
      })
      ctx.tags = newTags
    },
  },
})
