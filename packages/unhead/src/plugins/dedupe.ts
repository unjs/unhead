import type { HeadTag } from '@unhead/schema'
import { defineHeadPlugin, HasElementTags, hashTag, tagDedupeKey, tagWeight } from '@unhead/shared'

const UsesMergeStrategy = new Set(['templateParams', 'htmlAttrs', 'bodyAttrs'])

export default defineHeadPlugin(head => ({
  hooks: {
    'tag:normalise': ({ tag }) => {
      // support for third-party dedupe keys
      if (tag.props.hid) {
        tag.key = tag.props.hid
        delete tag.props.hid
      }
      if (tag.props.vmid) {
        tag.key = tag.props.vmid
        delete tag.props.vmid
      }
      if (tag.props.key) {
        tag.key = tag.props.key
        delete tag.props.key
      }
      const generatedKey = tagDedupeKey(tag)
      if (generatedKey && !generatedKey.startsWith('meta:og:') && !generatedKey.startsWith('meta:twitter:')) {
        delete tag.key
      }
      const dedupe = generatedKey || (tag.key ? `${tag.tag}:${tag.key}` : false)
      if (dedupe)
        tag._d = dedupe
    },
    'tags:resolve': (ctx) => {
      // 1. Dedupe tags
      const deduping: Record<string, HeadTag> = Object.create(null)
      for (const tag of ctx.tags) {
        // need a seperate dedupe key other than _d
        const dedupeKey = (tag.key ? `${tag.tag}:${tag.key}` : tag._d) || hashTag(tag)
        const dupedTag: HeadTag = deduping[dedupeKey]
        // handling a duplicate tag
        if (dupedTag) {
          // default strategy is replace, unless we're dealing with a html or body attrs
          let strategy = tag?.tagDuplicateStrategy
          if (!strategy && UsesMergeStrategy.has(tag.tag))
            strategy = 'merge'

          if (strategy === 'merge') {
            const oldProps = dupedTag.props
            // special handle for styles
            if (oldProps.style && tag.props.style) {
              if (oldProps.style[oldProps.style.length - 1] !== ';') {
                oldProps.style += ';'
              }
              tag.props.style = `${oldProps.style} ${tag.props.style}`
            }
            // special handle for classes
            if (oldProps.class && tag.props.class) {
              tag.props.class = `${oldProps.class} ${tag.props.class}`
            }
            else if (oldProps.class) {
              tag.props.class = oldProps.class
            }
            // apply oldProps to current props
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
          else if ((!tag.key || !dupedTag.key) && tagWeight(head, tag) > tagWeight(head, dupedTag)) {
            // check tag weights
            continue
          }
        }
        // PERF: compute the number of props keys after static check
        const hasProps = tag.innerHTML || tag.textContent || Object.keys(tag.props).length !== 0
        // if the new tag does not have any props, we're trying to remove the duped tag from the DOM
        if (!hasProps && HasElementTags.has(tag.tag)) {
          // find the tag with the same key
          delete deduping[dedupeKey]
          continue
        }
        // make sure the tag we're replacing has a lower tag weight
        deduping[dedupeKey] = tag
      }
      const newTags: HeadTag[] = []
      for (const key in deduping) {
        const tag = deduping[key]
        // @ts-expect-error runtime type
        const dupes = tag._duped
        newTags.push(tag)
        // add the duped tags to the new tags
        if (dupes) {
          // @ts-expect-error runtime type
          delete tag._duped
          newTags.push(...dupes)
        }
      }
      ctx.tags = newTags
      // now filter out invalid meta
      // TODO separate plugin
      ctx.tags = ctx.tags
        .filter(t => !(t.tag === 'meta' && (t.props.name || t.props.property) && !t.props.content))
    },
  },
}))
