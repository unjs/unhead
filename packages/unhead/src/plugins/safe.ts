import type { HeadSafe, HeadTag } from '../types'
import type { BodyAttributes } from '../types/schema/bodyAttributes'
import type { HtmlAttributes } from '../types/schema/htmlAttributes'
import type { Link } from '../types/schema/link'
import type { Meta } from '../types/schema/meta'
import type { Noscript } from '../types/schema/noscript'
import type { Script } from '../types/schema/script'
import type { Style } from '../types/schema/style'
import { defineHeadPlugin } from '../utils/defineHeadPlugin'

const WhitelistAttributes = {
  htmlAttrs: new Set(['class', 'style', 'lang', 'dir'] satisfies (keyof HtmlAttributes)[]),
  bodyAttrs: new Set(['class', 'style'] satisfies (keyof BodyAttributes)[]),
  meta: new Set(['name', 'property', 'charset', 'content', 'media'] satisfies (keyof Meta)[]),
  noscript: new Set(['textContent'] satisfies (Partial<keyof Noscript> | 'textContent')[]),
  style: new Set(['media', 'textContent', 'nonce', 'title', 'blocking'] satisfies (Partial<keyof Style> | 'textContent')[]),
  script: new Set(['type', 'textContent', 'nonce', 'blocking'] satisfies (Partial<keyof Script> | 'textContent')[]),
  link: new Set(['color', 'crossorigin', 'fetchpriority', 'href', 'hreflang', 'imagesrcset', 'imagesizes', 'integrity', 'media', 'referrerpolicy', 'rel', 'sizes', 'type'] satisfies (keyof Link)[]),
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
