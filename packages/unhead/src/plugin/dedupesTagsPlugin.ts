import type { HeadTag, HeadTagKeys } from '@unhead/schema'
import { tagDedupeKey, defineHeadPlugin } from '@unhead/shared'

export interface DedupesTagsPluginOptions {
  dedupeKeys?: string[]
}

const UsesMergeStrategy = ['templateVars', 'htmlAttrs', 'bodyAttrs']

export const DedupesTagsPlugin = (options?: DedupesTagsPluginOptions) => {
  options = options || {}
  const dedupeKeys = options.dedupeKeys || ['hid', 'vmid', 'key'] as HeadTagKeys
  return defineHeadPlugin({
    hooks: {
      'tag:normalise': function ({ tag }) {
        // support for third-party dedupe keys
        dedupeKeys.forEach((key) => {
          if (tag.props[key]) {
            tag.key = tag.props[key]
            delete tag.props[key]
          }
        })
        const dedupe = tag.key ? `${tag.tag}:${tag.key}` : tagDedupeKey(tag)
        if (dedupe)
          tag._d = dedupe
      },
      'tags:resolve': function (ctx) {
        // 1. Dedupe tags
        const deduping: Record<string, HeadTag> = {}
        ctx.tags.forEach((tag) => {
          const dedupeKey = tag._d || tag._p!
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
            const propCount = Object.keys(tag.props).length
            // if the new tag does not have any props, we're trying to remove the dupedTag
            if (((propCount === 0) || (propCount === 1 && typeof tag.props['data-h-key'] !== 'undefined')) && !tag.children) {
              delete deduping[dedupeKey]
              return
            }
          }
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
}
