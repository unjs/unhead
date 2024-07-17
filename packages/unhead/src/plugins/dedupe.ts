import type { HeadTag } from '@unhead/schema'
import { HasElementTags, defineHeadPlugin, tagDedupeKey, tagWeight } from '@unhead/shared'

const UsesMergeStrategy = new Set(['templateParams', 'htmlAttrs', 'bodyAttrs'])

const thirdPartyDedupeKeys = ['hid', 'vmid', 'key']
const mergeCommonProps = ['class', 'style']

export default defineHeadPlugin({
  hooks: {
    'tag:normalise': ({ tag }) => {
      // support for third-party dedupe keys
      for (const key of thirdPartyDedupeKeys) {
        if (tag.props[key]) {
          tag.key = tag.props[key]
          delete tag.props[key]
        }
      }
      const generatedKey = tagDedupeKey(tag)
      const dedupe = generatedKey || (tag.key ? `${tag.tag}:${tag.key}` : false)
      if (dedupe)
        tag._d = dedupe
    },
    'tags:resolve': (ctx) => {
      // 1. Dedupe tags
      const deduping: Record<string, HeadTag> = {}
      for (const tag of ctx.tags) {
        // need a seperate dedupe key other than _d
        const dedupeKey = (tag.key ? `${tag.tag}:${tag.key}` : tag._d) || tag._p!
        const dupedTag: HeadTag = deduping[dedupeKey]
        // handling a duplicate tag
        if (dupedTag) {
          // default strategy is replace, unless we're dealing with a html or body attrs
          let strategy = tag?.tagDuplicateStrategy
          if (!strategy && UsesMergeStrategy.has(tag.tag))
            strategy = 'merge'

          if (strategy === 'merge') {
            const oldProps = dupedTag.props
            // apply oldProps to current props
            for (const key of mergeCommonProps) {
              if (oldProps[key]) {
                if (tag.props[key]) {
                  // ensure style merge doesn't result in invalid css
                  if (key === 'style' && !oldProps[key].endsWith(';'))
                    oldProps[key] += ';'

                  tag.props[key] = `${oldProps[key]} ${tag.props[key]}`
                }
                else {
                  tag.props[key] = oldProps[key]
                }
              }
            }
            deduping[dedupeKey].props = {
              ...oldProps,
              ...tag.props,
            }
            continue
          }
          else if (tag._e === dupedTag._e) {
            // add the duped tag to the current tag
            // @ts-expect-error runtime type
            dupedTag._duped = dupedTag._duped || []
            // @ts-expect-error runtime type
            tag._d = `${dupedTag._d}:${dupedTag._duped.length + 1}`
            // @ts-expect-error runtime type
            dupedTag._duped.push(tag)
            continue
          }
          else if (tagWeight(tag) > tagWeight(dupedTag)) {
            // check tag weights
            continue
          }
        }
        const propCount = Object.keys(tag.props).length + (tag.innerHTML ? 1 : 0) + (tag.textContent ? 1 : 0)
        // if the new tag does not have any props, we're trying to remove the duped tag from the DOM
        if (HasElementTags.has(tag.tag) && propCount === 0) {
          // find the tag with the same key
          delete deduping[dedupeKey]
          continue
        }
        // make sure the tag we're replacing has a lower tag weight
        deduping[dedupeKey] = tag
      }
      const newTags: HeadTag[] = []
      for (const key in deduping) {
        if (!Object.prototype.hasOwnProperty.call(deduping, key)) {
          continue
        }
        const tag = deduping[key]
        // @ts-expect-error runtime type
        const dupes = tag._duped
        // @ts-expect-error runtime type
        delete tag._duped
        newTags.push(tag)
        // add the duped tags to the new tags
        if (dupes)
          newTags.push(...dupes)
      }
      ctx.tags = newTags
      // now filter out invalid meta
      // TODO separate plugin
      ctx.tags = ctx.tags
        .filter(t => !(t.tag === 'meta' && (t.props.name || t.props.property) && !t.props.content))
    },
  },
})
