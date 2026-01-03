import type { HeadSafe } from '../types/safeSchema'
import type { HeadTag } from '../types/tags'
import { defineHeadPlugin } from './defineHeadPlugin'

const WhitelistAttributes = {
  htmlAttrs: new Set(['class', 'style', 'lang', 'dir']),
  bodyAttrs: new Set(['class', 'style']),
  meta: new Set(['name', 'property', 'charset', 'content', 'media']),
  noscript: new Set(['textContent']),
  style: new Set(['media', 'textContent', 'nonce', 'title', 'blocking']),
  script: new Set(['type', 'textContent', 'nonce', 'blocking']),
  link: new Set(['color', 'crossorigin', 'fetchpriority', 'href', 'hreflang', 'imagesrcset', 'imagesizes', 'integrity', 'media', 'referrerpolicy', 'rel', 'sizes', 'type']),
} as const

function acceptDataAttrs(value: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([key]) => key === 'id' || key.startsWith('data-')),
  )
}

function makeTagSafe(tag: HeadTag): HeadSafe | false {
  let next: Record<string, any> = {}
  const { tag: type, props: prev } = tag

  switch (type) {
    // always safe
    case 'title':
    case 'titleTemplate':
    case 'templateParams':
      next = prev
      break
    case 'htmlAttrs':
    case 'bodyAttrs':
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
      WhitelistAttributes.meta.forEach((key) => {
        if (prev[key]) {
          next[key] = prev[key]
        }
      })
      break
    // link tags we don't allow stylesheets, scripts, preloading, prerendering, prefetching, etc
    case 'link':
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
      WhitelistAttributes.noscript.forEach((key) => {
        if (prev[key]) {
          next[key] = prev[key]
        }
      })
      break
    // we only allow JSON in scripts
    case 'script':
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
        else if (prev[s]) {
          next[s] = prev[s]
        }
      })
      break
  }

  if (!Object.keys(next).length && !tag.tag.endsWith('Attrs')) {
    return false
  }

  tag.props = { ...acceptDataAttrs(prev), ...next }
  return tag
}

export const SafeInputPlugin = /* @PURE */ defineHeadPlugin({
  key: 'safe',
  hooks: {
    'entries:normalize': (ctx) => {
      if (ctx.entry.options?._safe) {
        ctx.tags = ctx.tags.reduce((acc: HeadTag[], tag) => {
          const safeTag = makeTagSafe(tag)
          if (safeTag)
            acc.push(safeTag as HeadTag)
          return acc
        }, [])
      }
    },
  },
})
