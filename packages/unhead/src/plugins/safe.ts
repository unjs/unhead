import type { HeadSafe } from '../types/safeSchema'
import type { HeadTag } from '../types/tags'
import { defineHeadPlugin } from './defineHeadPlugin'

const WhitelistAttributes = {
  htmlAttrs: new Set(['class', 'style', 'lang', 'dir']),
  bodyAttrs: new Set(['class', 'style']),
  meta: new Set(['name', 'property', 'charset', 'content', 'media']),
  noscript: new Set([] as string[]),
  style: new Set(['media', 'nonce', 'title', 'blocking']),
  script: new Set(['type', 'textContent', 'nonce', 'blocking']),
  link: new Set(['color', 'crossorigin', 'fetchpriority', 'href', 'hreflang', 'imagesrcset', 'imagesizes', 'integrity', 'media', 'referrerpolicy', 'rel', 'sizes', 'type']),
} as const

const BlockedLinkRels = new Set(['canonical', 'modulepreload', 'prerender', 'preload', 'prefetch', 'dns-prefetch', 'preconnect', 'manifest', 'pingback'])

const SafeAttrName = /^[a-z][a-z0-9\-]*[a-z0-9]$/i

const HtmlEntityHex = /&#x([0-9a-f]+);?/gi
const HtmlEntityDec = /&#(\d+);?/g
const HtmlEntityNamed = /&(tab|newline|colon|semi|lpar|rpar|sol|bsol|comma|period|excl|num|dollar|percnt|amp|apos|ast|plus|lt|gt|equals|quest|at|lsqb|rsqb|lcub|rcub|vert|hat|grave|tilde|nbsp);?/gi
// eslint-disable-next-line no-control-regex
const ControlChars = /[\x00-\x20]+/g

const NamedEntityMap: Record<string, string> = {
  tab: '\t',
  newline: '\n',
  colon: ':',
  semi: ';',
  lpar: '(',
  rpar: ')',
  sol: '/',
  bsol: '\\',
  comma: ',',
  period: '.',
  excl: '!',
  num: '#',
  dollar: '$',
  percnt: '%',
  amp: '&',
  apos: '\'',
  ast: '*',
  plus: '+',
  lt: '<',
  gt: '>',
  equals: '=',
  quest: '?',
  at: '@',
  lsqb: '[',
  rsqb: ']',
  lcub: '{',
  rcub: '}',
  vert: '|',
  hat: '^',
  grave: '`',
  tilde: '~',
  nbsp: '\u00A0',
}

// Decode HTML entities (numeric and named) that browsers decode in attribute values before URL processing
function safeFromCodePoint(codePoint: number): string {
  if (codePoint > 0x10FFFF || codePoint < 0 || Number.isNaN(codePoint))
    return ''
  return String.fromCodePoint(codePoint)
}

function decodeHtmlEntities(str: string): string {
  return str.replace(HtmlEntityHex, (_, hex) => safeFromCodePoint(Number.parseInt(hex, 16)))
    .replace(HtmlEntityDec, (_, dec) => safeFromCodePoint(Number(dec)))
    .replace(HtmlEntityNamed, (_, name) => NamedEntityMap[name.toLowerCase()] || '')
}

// Strip ASCII control chars (0x00-0x1F), whitespace, and percent-decode, then check for dangerous schemes
function hasDangerousProtocol(url: string): boolean {
  // decode HTML entities first (browsers decode these in attribute values before URL processing)
  const entityDecoded = decodeHtmlEntities(url)
  // strip control chars, tabs, newlines, spaces that browsers strip during URL parsing
  const cleaned = entityDecoded.replace(ControlChars, '')
  // percent-decode to catch java%73cript: etc
  let decoded: string
  try {
    decoded = decodeURIComponent(cleaned)
  }
  catch {
    decoded = cleaned
  }
  // strip control chars again after decoding (encoded control chars like %09)
  const sanitized = decoded.replace(ControlChars, '')
  const lower = sanitized.toLowerCase()
  return lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')
}

function stripProtoKeys(obj: any): any {
  if (Array.isArray(obj))
    return obj.map(stripProtoKeys)
  if (obj && typeof obj === 'object') {
    const clean: Record<string, any> = {}
    for (const key of Object.keys(obj)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype')
        continue
      clean[key] = stripProtoKeys(obj[key])
    }
    return clean
  }
  return obj
}

function acceptDataAttrs(value: Record<string, string>, allowId = true) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([key]) => ((allowId && key === 'id') || key.startsWith('data-')) && SafeAttrName.test(key)),
  )
}

function makeTagSafe(tag: HeadTag): HeadSafe | false {
  let next: Record<string, any> = {}
  const { tag: type, props: prev } = tag

  switch (type) {
    // title: textContent is escaped in rendering (tagToString), no props needed
    case 'title':
      break
    // virtual tags, not rendered to HTML — but sanitize to prevent injection if rendered
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
      // don't allow id on html/body (DOM clobbering)
      delete tag.innerHTML
      delete tag.textContent
      tag.props = { ...acceptDataAttrs(prev, false), ...next }
      return !Object.keys(tag.props).length ? false : tag
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
    // link tags we block preloading, prerendering, prefetching, dns-prefetch, preconnect, manifest, etc
    case 'link':
      WhitelistAttributes.link.forEach((key) => {
        const val = prev[key]
        if (!val) {
          return
        }
        // block bad rel types
        if (key === 'rel' && (typeof val !== 'string' || BlockedLinkRels.has(val.toLowerCase()))) {
          return
        }
        if (key === 'href' || key === 'imagesrcset') {
          if (typeof val !== 'string') {
            return
          }
          // for imagesrcset, validate each comma-separated URL entry
          const urls = key === 'imagesrcset' ? val.split(',').map(s => s.trim()) : [val]
          if (urls.some(u => hasDangerousProtocol(u))) {
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
      if (!tag.textContent || typeof prev.type !== 'string' || !prev.type.endsWith('json')) {
        return false
      }
      // sanitize textContent via JSON round-trip, stripping proto keys
      try {
        const jsonVal = typeof tag.textContent === 'string' ? JSON.parse(tag.textContent) : tag.textContent
        tag.textContent = JSON.stringify(stripProtoKeys(jsonVal), null, 0)
      }
      catch {
        return false
      }
      WhitelistAttributes.script.forEach((s) => {
        if (s !== 'textContent' && prev[s]) {
          next[s] = prev[s]
        }
      })
      break
  }

  // never allow innerHTML in safe mode
  delete tag.innerHTML
  // only allow textContent for title (escaped in rendering) and script (JSON-sanitized above)
  if (type !== 'title' && type !== 'script') {
    delete tag.textContent
  }

  tag.props = { ...acceptDataAttrs(prev), ...next }

  if (!Object.keys(tag.props).length && !tag.tag.endsWith('Attrs') && !tag.textContent) {
    return false
  }

  return tag
}

export const SafeInputPlugin = /* @PURE */ defineHeadPlugin({
  key: 'safe',
  hooks: {
    'entries:normalize': (ctx) => {
      if (ctx.entry.options?._safe) {
        ctx.tags = ctx.tags.reduce((acc: HeadTag[], tag: HeadTag) => {
          const safeTag = makeTagSafe(tag)
          if (safeTag)
            acc.push(safeTag as HeadTag)
          return acc
        }, [])
      }
    },
  },
})
