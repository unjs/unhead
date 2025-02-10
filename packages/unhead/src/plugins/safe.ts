import type { HeadSafe, HeadTag } from '../types'
import { defineHeadPlugin } from '../utils/defineHeadPlugin'

const WhitelistAttributes = {
  htmlAttrs: ['id', 'class', 'lang', 'dir'],
  bodyAttrs: ['id', 'class'],
  meta: ['id', 'name', 'property', 'charset', 'content'],
  style: ['id', 'type', 'media', 'scoped', 'title', 'textContent'],
  noscript: ['id', 'textContent'],
  script: ['id', 'type', 'textContent'],
  link: ['id', 'color', 'crossorigin', 'fetchpriority', 'href', 'hreflang', 'imagesrcset', 'imagesizes', 'integrity', 'media', 'referrerpolicy', 'rel', 'sizes', 'type'],
}

function acceptDataAttrs(value: Record<string, string>) {
  const filtered: Record<string, string> = {}
  // add any data attributes
  Object.keys(value || {})
    .filter(a => a.startsWith('data-'))
    .forEach((a) => {
      filtered[a] = value[a]
    })
  return filtered
}

export function makeTagSafe(tag: HeadTag): HeadSafe | false {
  let next: Record<string, any> = {}
  const type = tag.tag
  const prev = tag.props

  switch (type) {
    // always safe
    case 'title':
    case 'titleTemplate':
    case 'templateParams':
      next = prev
      break
    case 'htmlAttrs':
    case 'bodyAttrs':
      next = acceptDataAttrs(prev)
      WhitelistAttributes[type].forEach((attr) => {
        if (prev[attr]) {
          next[attr] = prev[attr]
        }
      })
      break
    case 'style':
      next = acceptDataAttrs(prev)
      WhitelistAttributes.style.forEach((key) => {
        if (prev[key]) {
          next[key] = prev[key]
        }
      })
      break
    // meta is safe, except for http-equiv
    case 'meta':
      next = acceptDataAttrs(prev)
      WhitelistAttributes.meta.forEach((key) => {
        if (prev[key]) {
          next[key] = prev[key]
        }
      })
      break
    // link tags we don't allow stylesheets, scripts, preloading, prerendering, prefetching, etc
    case 'link':
      next = acceptDataAttrs(prev)
      WhitelistAttributes.link.forEach((key) => {
        const val = prev[key]
        if (!val) {
          return
        }
        // block bad rel types
        if (key === 'rel' && (val === 'canonical' || val === 'modulepreload' || val === 'prerender' || val === 'preload' || val === 'prefetch')) {
          return
        }
        if (key === 'href') {
          if (val.includes('javascript:') || val.includes('data:')) {
            return
          }
          next[key] = val
        }
        else if (val) {
          next[key] = val
        }
      })
      if ((!next.href && !next.imagesrcset) || !next.rel) {
        return false
      }
      break
    case 'noscript':
      next = acceptDataAttrs(prev)
      WhitelistAttributes.noscript.forEach((key) => {
        if (prev[key]) {
          next[key] = prev[key]
        }
      })
      break
    // we only allow JSON in scripts
    case 'script':
      next = acceptDataAttrs(prev)
      if (!tag.textContent || !prev.type?.endsWith('json')) {
        return false
      }
      WhitelistAttributes.script.forEach((s) => {
        if (prev[s] === 'textContent') {
          try {
            const jsonVal = typeof prev[s] === 'string' ? JSON.parse(prev[s]) : prev[s]
            next[s] = JSON.stringify(jsonVal, null, 0)
          }
          catch {
          }
        }
      })
      break
  }

  if (!Object.keys(next)) {
    return false
  }

  tag.props = next
  return tag
}

export const SafeInputPlugin = /* @__PURE__ */ defineHeadPlugin({
  key: 'safe',
  hooks: {
    'entries:normalize': (ctx) => {
      // @ts-expect-error untyped
      if (!ctx.entry.options?._safe) {
        return
      }
      ctx.tags = ctx.tags.map(makeTagSafe).filter(Boolean) as HeadTag[]
    },
  },
})
