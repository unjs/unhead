import type { HeadTag } from '../types'
import { TagPriorityAliases } from '../utils/const'

// Capo.js tag weights for optimal head ordering
const TAG_WEIGHTS = { base: -10, title: 10 } as const
const LINK_WEIGHTS = { 'preconnect': 20, 'stylesheet': 60, 'preload': 70, 'modulepreload': 70, 'prefetch': 90, 'dns-prefetch': 90, 'prerender': 90 } as const
const ImportStyleRe = /@import/
const isTruthy = (v?: string | boolean) => v === '' || v === true

export function capoTagWeight(tag: HeadTag): number {
  if (typeof tag.tagPriority === 'number')
    return tag.tagPriority
  let weight = 100
  const offset = TagPriorityAliases[tag.tagPriority as keyof typeof TagPriorityAliases] || 0
  if (tag.tag in TAG_WEIGHTS) {
    weight = TAG_WEIGHTS[tag.tag as keyof typeof TAG_WEIGHTS]
  }
  else if (tag.tag === 'meta') {
    weight = tag.props['http-equiv'] === 'content-security-policy' ? -30 : tag.props.charset ? -20 : tag.props.name === 'viewport' ? -15 : weight
  }
  else if (tag.tag === 'link' && tag.props.rel) {
    weight = LINK_WEIGHTS[tag.props.rel as keyof typeof LINK_WEIGHTS]
  }
  else if (tag.tag === 'script') {
    const type = String(tag.props.type)
    const json = type.endsWith('json')
    if (type === 'importmap')
      // parse-time directive, not a loadable resource: placed between
      // preconnect (20) and async scripts (30) so it precedes every module
      // script (including `<script type="module" async>`) per HTML spec
      weight = 25
    else if (type === 'speculationrules')
      // performance hint, belongs late in head alongside prefetch/prerender
      weight = 90
    else if (isTruthy(tag.props.async))
      weight = 30
    // async is falsy past this point
    else if ((tag.props.src && !isTruthy(tag.props.defer) && type !== 'module' && !json) || ((tag.innerHTML || tag.textContent) && !json))
      weight = 50
    else if ((isTruthy(tag.props.defer) && tag.props.src) || type === 'module')
      weight = 80
  }
  else if (tag.tag === 'style') {
    weight = tag.innerHTML && ImportStyleRe.test(tag.innerHTML) ? 40 : 60
  }
  return (weight || 100) + offset
}
