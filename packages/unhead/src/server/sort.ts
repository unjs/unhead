import type { HeadTag } from '../types'
import { TagPriorityAliases } from '../utils/const'

// Capo.js tag weights for optimal head ordering
const TAG_WEIGHTS = { base: -10, title: 10 } as const
const CAPO_WEIGHTS = {
  meta: { 'content-security-policy': -30, 'charset': -20, 'viewport': -15 },
  link: { 'preconnect': 20, 'stylesheet': 60, 'preload': 70, 'modulepreload': 70, 'prefetch': 90, 'dns-prefetch': 90, 'prerender': 90 },
  script: { async: 30, defer: 80, sync: 50 },
  style: { imported: 40, sync: 60 },
} as const
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
    const t = tag.props['http-equiv'] === 'content-security-policy' ? 'content-security-policy' : tag.props.charset ? 'charset' : tag.props.name === 'viewport' ? 'viewport' : null
    if (t)
      weight = CAPO_WEIGHTS.meta[t as keyof typeof CAPO_WEIGHTS.meta]
  }
  else if (tag.tag === 'link' && tag.props.rel) {
    weight = CAPO_WEIGHTS.link[tag.props.rel as keyof typeof CAPO_WEIGHTS.link]
  }
  else if (tag.tag === 'script') {
    const type = String(tag.props.type)
    if (isTruthy(tag.props.async))
      weight = CAPO_WEIGHTS.script.async
    else if ((tag.props.src && !isTruthy(tag.props.defer) && !isTruthy(tag.props.async) && type !== 'module' && !type.endsWith('json')) || (tag.innerHTML && !type.endsWith('json')))
      weight = CAPO_WEIGHTS.script.sync
    else if ((isTruthy(tag.props.defer) && tag.props.src && !isTruthy(tag.props.async)) || type === 'module')
      weight = CAPO_WEIGHTS.script.defer
  }
  else if (tag.tag === 'style') {
    weight = tag.innerHTML && ImportStyleRe.test(tag.innerHTML) ? CAPO_WEIGHTS.style.imported : CAPO_WEIGHTS.style.sync
  }
  return (weight || 100) + offset
}
