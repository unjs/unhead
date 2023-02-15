import type { HeadTag, HeadTagKeys } from '@unhead/schema/dist'
import { UniqueTags, defineHeadPlugin } from '.'

export interface DedupesTagsPluginOptions {
  dedupeKeys?: string[]
}

export function tagDedupeKey<T extends HeadTag>(tag: T, fn?: (key: string) => boolean): string | false {
  const { props, tag: tagName } = tag
  // must only be a single base so we always dedupe
  if (UniqueTags.includes(tagName))
    return tagName

  // support only a single canonical
  if (tagName === 'link' && props.rel === 'canonical')
    return 'canonical'

  // must only be a single charset
  if (props.charset)
    return 'charset'

  const name = ['id']
  if (tagName === 'meta')
    name.push(...['name', 'property', 'http-equiv'])
  for (const n of name) {
    // open graph props can have multiple tags with the same property
    if (typeof props[n] !== 'undefined') {
      const val = String(props[n])
      if (fn && !fn(val))
        return false
      // for example: meta-name-description
      return `${tagName}:${n}:${val}`
    }
  }
  return false
}

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
          let dedupeKey = tag._d || tag._p!
          const dupedTag = deduping[dedupeKey]
          // handling a duplicate tag
          if (dupedTag) {
            // default strategy is replace, unless we're dealing with a html or body attrs
            let strategy = tag?.tagDuplicateStrategy
            if (!strategy && (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs'))
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
              // allow entries to have duplicate tags
              dedupeKey = tag._d = `${dedupeKey}:${tag._p}`
            }
            const propCount = Object.keys(tag.props).length
            // if the new tag does not have any props we're trying to remove the dupedTag
            if (((propCount === 0) || (propCount === 1 && typeof tag.props['data-h-key'] !== 'undefined')) && !tag.children) {
              delete deduping[dedupeKey]
              return
            }
          }
          deduping[dedupeKey] = tag
        })
        ctx.tags = Object.values(deduping)
      },
    },
  })
}
