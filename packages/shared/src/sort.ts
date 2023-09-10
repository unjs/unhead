import type { HeadTag } from '@unhead/schema'

export const TAG_WEIGHTS = {
  // tags
  base: -10,
  title: 10,
} as const

export const TAG_ALIASES = {
  // relative scores to their default values
  critical: -80,
  high: -10,
  low: 20,
} as const

export function tagWeight<T extends HeadTag>(tag: T) {
  let weight = 100
  const priority = tag.tagPriority
  if (typeof priority === 'number')
    return priority
  if (tag.tag === 'meta') {
    // charset must come early in case there's non-utf8 characters in the HTML document
    if (tag.props.charset)
      weight = -20
    // CSP needs to be as it effects the loading of assets
    if (tag.props['http-equiv'] === 'content-security-policy')
      weight = 0
  }
  else if (tag.tag === 'link' && tag.props.rel === 'preconnect') {
    // preconnects should almost always come first
    weight = 20
  }
  else if (tag.tag in TAG_WEIGHTS) {
    weight = TAG_WEIGHTS[tag.tag as keyof typeof TAG_WEIGHTS]
  }
  if (typeof priority === 'string' && priority in TAG_ALIASES) {
    // @ts-expect-error untyped
    return weight + TAG_ALIASES[priority]
  }
  return weight
}
export const SortModifiers = [{ prefix: 'before:', offset: -1 }, { prefix: 'after:', offset: 1 }]
