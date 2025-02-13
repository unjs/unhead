import type { HeadTag, Unhead } from '../types'

// @ts-expect-error untyped
export const sortTags = (a: HeadTag, b: HeadTag) => a._w === b._w ? a._p - b._p : a._w - b._w

const TAG_WEIGHTS = {
  base: -10,
  title: 10,
} as const

const TAG_ALIASES = {
  critical: -8,
  high: -1,
  low: 2,
} as const

const WEIGHT_MAP = {
  meta: {
    'content-security-policy': -30,
    'charset': -20,
    'viewport': -15,
  },
  link: {
    'preconnect': 20,
    'stylesheet': 60,
    'preload': 70,
    'modulepreload': 70,
    'prefetch': 90,
    'dns-prefetch': 90,
    'prerender': 90,
  },
  script: {
    async: 30,
    defer: 80,
    sync: 50,
  },
  style: {
    imported: 40,
    sync: 60,
  },
} as const

const isImportStyle = /@import/.test.bind(/@import/)
const isTruthy = (val?: string | boolean) => val === '' || val === true

export function tagWeight<T extends HeadTag>(head: Unhead<any>, tag: T): number {
  if (typeof tag.tagPriority === 'number')
    return tag.tagPriority

  let weight = 100

  const offset = TAG_ALIASES[tag.tagPriority as keyof typeof TAG_ALIASES] || 0
  const weightMap = head.resolvedOptions.disableCapoSorting
    ? {
        link: {},
        script: {},
        style: {},
      } as typeof WEIGHT_MAP
    : WEIGHT_MAP

  // Handle basic tag weights
  if (tag.tag in TAG_WEIGHTS) {
    weight = TAG_WEIGHTS[tag.tag as keyof typeof TAG_WEIGHTS]
  }
  // Handle meta tags
  else if (tag.tag === 'meta') {
    const metaType = tag.props['http-equiv'] === 'content-security-policy'
      ? 'content-security-policy'
      : tag.props.charset
        ? 'charset'
        : tag.props.name === 'viewport'
          ? 'viewport'
          : null

    if (metaType)
      weight = WEIGHT_MAP.meta[metaType as keyof typeof WEIGHT_MAP.meta]
  }

  // Handle link tags
  else if (tag.tag === 'link' && tag.props.rel) {
    weight = weightMap.link[tag.props.rel as keyof typeof weightMap.link]
  }

  // Handle script tags
  else if (tag.tag === 'script') {
    if (isTruthy(tag.props.async)) {
      weight = weightMap.script.async
    }
    else if (tag.props.src
      && !isTruthy(tag.props.defer)
      && !isTruthy(tag.props.async)
      && tag.props.type !== 'module'
      && !tag.props.type?.endsWith('json')) {
      weight = weightMap.script.sync
    }
    else if (isTruthy(tag.props.defer) && tag.props.src && !isTruthy(tag.props.async)) {
      weight = weightMap.script.defer
    }
  }

  // Handle style tags
  else if (tag.tag === 'style') {
    weight = tag.innerHTML && isImportStyle(tag.innerHTML)
      ? weightMap.style.imported
      : weightMap.style.sync
  }

  return (weight || 100) + offset
}
