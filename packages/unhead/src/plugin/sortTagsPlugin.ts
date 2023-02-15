import type { HeadTag } from '@unhead/schema'
import { defineHeadPlugin } from '@unhead/shared'

export const TAG_WEIGHTS = {
  // aliases
  critical: 2,
  high: 9,
  low: 12,
  // tags
  base: -1,
  title: 1,
  meta: 10,
} as const

export function tagWeight<T extends HeadTag>(tag: T) {
  if (typeof tag.tagPriority === 'number')
    return tag.tagPriority
  if (tag.tag === 'meta') {
    // charset must come early in case there's non-utf8 characters in the HTML document
    if (tag.props.charset)
      return -2
    // CSP needs to be as it effects the loading of assets
    if (tag.props['http-equiv'] === 'content-security-policy')
      return 0
  }
  const key = tag.tagPriority || tag.tag
  if (key in TAG_WEIGHTS) {
    // @ts-expect-error untyped
    return TAG_WEIGHTS[key]
  }
  return 10
}
export const SortModifiers = [{ prefix: 'before:', offset: -1 }, { prefix: 'after:', offset: 1 }]

export function SortTagsPlugin() {
  return defineHeadPlugin({
    hooks: {
      'tags:resolve': (ctx) => {
        const tagPositionForKey = (key: string) => ctx.tags.find(tag => tag._d === key)?._p

        // 2a. Sort based on priority
        // now we need to check render priority for each before: rule and use the dedupe key index
        for (const { prefix, offset } of SortModifiers) {
          for (const tag of ctx.tags.filter(tag => typeof tag.tagPriority === 'string' && tag.tagPriority!.startsWith(prefix))) {
            const position = tagPositionForKey(
              (tag.tagPriority as string).replace(prefix, ''),
            )
            if (typeof position !== 'undefined')
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
}
