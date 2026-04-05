import type { HeadSafe } from '../types/safeSchema'
import type { HeadTag } from '../types/tags'
import { defineHeadPlugin } from './defineHeadPlugin'

const _s = /* @__PURE__ */ (s: string) => new Set(s.split(' '))
const WhitelistAttributes: Record<string, Set<string>> = /* @__PURE__ */ {
  htmlAttrs: _s('class style lang dir'),
  bodyAttrs: _s('class style'),
  meta: _s('name property charset content media'),
  noscript: new Set(),
  style: _s('media nonce title blocking'),
  script: _s('type textContent nonce blocking'),
  link: _s('color crossorigin fetchpriority href hreflang imagesrcset imagesizes integrity media referrerpolicy rel sizes type'),
}

const BlockedLinkRels = /* @__PURE__ */ _s('canonical modulepreload prerender preload prefetch dns-prefetch preconnect manifest pingback')

const SafeAttrName = /^[a-z][a-z0-9\-]*[a-z0-9]$/i

const HtmlEntityHex = /&#x([0-9a-f]{1,6});?/gi
const HtmlEntityDec = /&#(\d{1,7});?/g
const HtmlEntityNamed = /&(tab|newline|colon|semi|lpar|rpar|sol|bsol|comma|period|excl|num|dollar|percnt|amp|apos|ast|plus|lt|gt|equals|quest|at|lsqb|rsqb|lcub|rcub|vert|hat|grave|tilde|nbsp);?/gi
// eslint-disable-next-line no-control-regex
const ControlChars = /[\x00-\x20]+/g

const NamedEntityMap: Record<string, string> = /* @__PURE__ */ Object.fromEntries(
  'tab\t,newline\n,colon:,semi;,lpar(,rpar),sol/,bsol\\,comma,,period.,excl!,num#,dollar$,percnt%,amp&,apos\',ast*,plus+,lt<,gt>,equals=,quest?,at@,lsqb[,rsqb],lcub{,rcub},vert|,hat^,grave`,tilde~,nbsp\u00A0'
    .split(',').map(e => [e.slice(0, -1), e.slice(-1)]),
)

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

const ProtoKeys = /* @__PURE__ */ new Set(['__proto__', 'constructor', 'prototype'])
function stripProtoKeys(obj: any): any {
  if (Array.isArray(obj))
    return obj.map(stripProtoKeys)
  if (obj && typeof obj === 'object') {
    const clean: Record<string, any> = {}
    for (const key of Object.keys(obj)) {
      if (!ProtoKeys.has(key))
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

function pickWhitelisted(prev: Record<string, any>, whitelist: Set<string>): Record<string, any> {
  const o: Record<string, any> = {}
  for (const k of whitelist) {
    if (prev[k])
      o[k] = prev[k]
  }
  return o
}

function makeTagSafe(tag: HeadTag): HeadSafe | false {
  const { tag: type, props: prev } = tag
  let next: Record<string, any> = {}

  if (type === 'titleTemplate' || type === 'templateParams') {
    next = prev
  }
  else if (type === 'htmlAttrs' || type === 'bodyAttrs') {
    next = pickWhitelisted(prev, WhitelistAttributes[type])
    delete tag.innerHTML
    delete tag.textContent
    tag.props = { ...acceptDataAttrs(prev, false), ...next }
    return Object.keys(tag.props).length ? tag : false
  }
  else if (type === 'style') {
    next = { ...acceptDataAttrs(prev), ...pickWhitelisted(prev, WhitelistAttributes.style) }
  }
  else if (type === 'meta') {
    next = pickWhitelisted(prev, WhitelistAttributes.meta)
  }
  else if (type === 'link') {
    for (const key of WhitelistAttributes.link) {
      const val = prev[key]
      if (!val)
        continue
      if (key === 'rel' && (typeof val !== 'string' || BlockedLinkRels.has(val.toLowerCase())))
        continue
      if (key === 'href' || key === 'imagesrcset') {
        if (typeof val !== 'string')
          continue
        const urls = key === 'imagesrcset' ? val.split(',').map(s => s.trim()) : [val]
        if (urls.some(u => hasDangerousProtocol(u)))
          continue
      }
      next[key] = val
    }
    if ((!next.href && !next.imagesrcset) || !next.rel)
      return false
  }
  else if (type === 'noscript') {
    next = pickWhitelisted(prev, WhitelistAttributes.noscript)
  }
  else if (type === 'script') {
    if (!tag.textContent || typeof prev.type !== 'string' || !prev.type.endsWith('json'))
      return false
    try {
      const jsonVal = typeof tag.textContent === 'string' ? JSON.parse(tag.textContent) : tag.textContent
      tag.textContent = JSON.stringify(stripProtoKeys(jsonVal), null, 0)
    }
    catch { return false }
    next = pickWhitelisted(prev, WhitelistAttributes.script)
    delete next.textContent
  }
  // title: textContent is escaped in rendering, no extra props needed

  delete tag.innerHTML
  if (type !== 'title' && type !== 'script')
    delete tag.textContent

  tag.props = type === 'style' ? next : { ...acceptDataAttrs(prev), ...next }

  if (!Object.keys(tag.props).length && !type.endsWith('Attrs') && !tag.textContent)
    return false
  return tag
}

export const SafeInputPlugin = /* @__PURE__ */ defineHeadPlugin({
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
