import type { HeadTag, Unhead } from 'unhead/types'

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

export const SortModifiers = [{ prefix: 'before:', offset: -1 }, { prefix: 'after:', offset: 1 }]

const importRe = /@import/
const isTruthy = (val?: string | boolean) => val === '' || val === true

export function tagWeight<T extends HeadTag>(head: Unhead<any>, tag: T) {
  const priority = tag.tagPriority
  if (typeof priority === 'number')
    return priority
  const isScript = tag.tag === 'script'
  const isLink = tag.tag === 'link'
  const isStyle = tag.tag === 'style'
  let weight = 100
  if (tag.tag === 'meta') {
    // CSP needs to be as it effects the loading of assets
    if (tag.props['http-equiv'] === 'content-security-policy')
      weight = -30
    // charset must come early in case there's non-utf8 characters in the HTML document
    else if (tag.props.charset)
      weight = -20
    else if (tag.props.name === 'viewport')
      weight = -15
  }
  else if (isLink && tag.props.rel === 'preconnect') {
    // preconnects should almost always come first
    weight = 20
  }
  else if (tag.tag in TAG_WEIGHTS) {
    weight = TAG_WEIGHTS[tag.tag as keyof typeof TAG_WEIGHTS]
  }
  if (priority && priority in TAG_ALIASES) {
    // @ts-expect-e+rror untyped
    return weight + TAG_ALIASES[priority as keyof typeof TAG_ALIASES]
  }
  if (tag.tagPosition && tag.tagPosition !== 'head') {
    return weight
  }
  if (!head.ssr || head.resolvedOptions.disableCapoSorting) {
    return weight
  }
  if (isScript && isTruthy(tag.props.async)) {
    // ASYNC_SCRIPT
    weight = 30
    // SYNC_SCRIPT
  }
  else if (isStyle && tag.innerHTML && importRe.test(tag.innerHTML)) {
    // IMPORTED_STYLES
    weight = 40
  }
  else if (isScript && tag.props.src && !isTruthy(tag.props.defer) && !isTruthy(tag.props.async) && tag.props.type !== 'module' && !tag.props.type?.endsWith('json')) {
    weight = 50
  }
  else if ((isLink && tag.props.rel === 'stylesheet') || tag.tag === 'style') {
    // SYNC_STYLES
    weight = 60
  }
  else if (isLink && (tag.props.rel === 'preload' || tag.props.rel === 'modulepreload')) {
    // PRELOAD
    weight = 70
  }
  else if (isScript && isTruthy(tag.props.defer) && tag.props.src && !isTruthy(tag.props.async)) {
    // DEFER_SCRIPT
    weight = 80
  }
  else if (isLink && (tag.props.rel === 'prefetch' || tag.props.rel === 'dns-prefetch' || tag.props.rel === 'prerender')) {
    weight = 90
  }
  return weight
}
