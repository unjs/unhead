/**
 * useHeadSafe allowlist as a pure input filter (v4 shape: no plugin, no core
 * bytes for non-users). Port of v3 SafeInputPlugin's makeTagSafe, applied to
 * resolved head input before push instead of to normalized tags.
 *
 * Escape modes in the v4 compiler cover the value level (title text, attr
 * quoting, script JSON `<`); this filter covers the semantic level: `on*`
 * handlers, `http-equiv` redirects, `javascript:` urls, raw innerHTML and
 * resource-hinting link rels.
 */

const WHITELIST = {
  htmlAttrs: /* @__PURE__ */ new Set(['class', 'style', 'lang', 'dir']),
  bodyAttrs: /* @__PURE__ */ new Set(['class', 'style']),
  meta: /* @__PURE__ */ new Set(['name', 'property', 'charset', 'content', 'media']),
  noscript: /* @__PURE__ */ new Set<string>([]),
  style: /* @__PURE__ */ new Set(['media', 'nonce', 'title', 'blocking']),
  script: /* @__PURE__ */ new Set(['type', 'nonce', 'blocking']),
  link: /* @__PURE__ */ new Set(['color', 'crossorigin', 'fetchpriority', 'href', 'hreflang', 'imagesrcset', 'imagesizes', 'integrity', 'media', 'referrerpolicy', 'rel', 'sizes', 'type']),
} as const

const BLOCKED_LINK_RELS = /* @__PURE__ */ new Set(['canonical', 'modulepreload', 'prerender', 'preload', 'prefetch', 'dns-prefetch', 'preconnect', 'manifest', 'pingback'])

const SAFE_DATA_ATTR = /^[a-z][a-z0-9-]*[a-z0-9]$/i
const ASCII_WS = /[\t\n\f\r ]+/

const ENTITY_HEX = /&#x([0-9a-f]+);?/gi
const ENTITY_DEC = /&#(\d+);?/g
const ENTITY_NAMED = /&(tab|newline|colon|semi|lpar|rpar|sol|bsol|comma|period|excl|num|dollar|percnt|amp|apos|ast|plus|lt|gt|equals|quest|at|lsqb|rsqb|lcub|rcub|vert|hat|grave|tilde|nbsp);?/gi
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x20]+/g

const NAMED_ENTITIES: Record<string, string> = {
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
  nbsp: ' ',
}

const hasContent = (value: unknown) => typeof value === 'number' ? Number.isFinite(value) : !!value

function safeFromCodePoint(codePoint: number): string {
  if (codePoint > 0x10FFFF || codePoint < 0 || Number.isNaN(codePoint))
    return ''
  return String.fromCodePoint(codePoint)
}

function decodeHtmlEntities(str: string): string {
  return str.replace(ENTITY_HEX, (_, hex) => safeFromCodePoint(Number.parseInt(hex, 16)))
    .replace(ENTITY_DEC, (_, dec) => safeFromCodePoint(Number(dec)))
    .replace(ENTITY_NAMED, (_, name) => NAMED_ENTITIES[name.toLowerCase()] || '')
}

// entity-decode, strip control chars, percent-decode, then test for dangerous schemes
function hasDangerousProtocol(url: string): boolean {
  const cleaned = decodeHtmlEntities(url).replace(CONTROL_CHARS, '')
  let decoded: string
  try {
    decoded = decodeURIComponent(cleaned)
  }
  catch {
    decoded = cleaned
  }
  const lower = decoded.replace(CONTROL_CHARS, '').toLowerCase()
  return lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')
}

const UNSAFE_KEYS = /* @__PURE__ */ new Set(['__proto__', 'constructor', 'prototype'])

function stripProtoKeys(obj: any): any {
  if (Array.isArray(obj))
    return obj.map(stripProtoKeys)
  if (obj && typeof obj === 'object') {
    const clean: Record<string, any> = {}
    for (const key of Object.keys(obj)) {
      if (UNSAFE_KEYS.has(key))
        continue
      clean[key] = stripProtoKeys(obj[key])
    }
    return clean
  }
  return obj
}

function acceptDataAttrs(props: Record<string, any>, next: Record<string, any>, allowId = true) {
  for (const key in props) {
    if ((key.startsWith('data-') || (allowId && key === 'id')) && SAFE_DATA_ATTR.test(key))
      next[key] = props[key]
  }
}

function hasBlockedRel(rel: string): boolean {
  const tokens = rel.split(ASCII_WS)
  return !tokens.some(Boolean) || tokens.some(token => BLOCKED_LINK_RELS.has(token.toLowerCase()))
}

// input-order iteration so author prop order survives filtering
function pickWhitelisted(props: Record<string, any>, allow: ReadonlySet<string>): Record<string, any> {
  const next: Record<string, any> = {}
  for (const key in props) {
    if (allow.has(key) && props[key])
      next[key] = props[key]
  }
  return next
}

function safeMeta(props: Record<string, any>): Record<string, any> | null {
  const next: Record<string, any> = {}
  for (const key in props) {
    if (WHITELIST.meta.has(key) && (hasContent(props[key]) || (key === 'content' && Array.isArray(props[key]))))
      next[key] = props[key]
  }
  // an identity key is required: a bare `content` meta survives v3's tag-level
  // filter but carries no meaning, and `http-equiv` identities are blocked
  if (!next.name && !next.property && !next.charset)
    return null
  acceptDataAttrs(props, next)
  return next
}

function safeLink(props: Record<string, any>): Record<string, any> | null {
  const next: Record<string, any> = {}
  for (const key in props) {
    const val = props[key]
    if (!WHITELIST.link.has(key) || !val)
      continue
    if (key === 'rel' && (typeof val !== 'string' || hasBlockedRel(val)))
      continue
    if (key === 'href' || key === 'imagesrcset') {
      if (typeof val !== 'string')
        continue
      const urls = key === 'imagesrcset' ? val.split(',').map(s => s.trim()) : [val]
      if (urls.some(u => hasDangerousProtocol(u)))
        continue
      next[key] = val
    }
    else {
      next[key] = val
    }
  }
  if ((!next.href && !next.imagesrcset) || !next.rel)
    return null
  acceptDataAttrs(props, next)
  return next
}

// scripts only survive as JSON payloads: textContent round-trips through
// JSON.parse/stringify (proto keys stripped) and type must end in `json`
function safeScript(props: Record<string, any>): Record<string, any> | null {
  const textContent = props.textContent ?? props.innerHTML
  if (!textContent || typeof props.type !== 'string' || !props.type.endsWith('json'))
    return null
  let json: string
  try {
    const val = typeof textContent === 'string' ? JSON.parse(textContent) : textContent
    json = JSON.stringify(stripProtoKeys(val), null, 0)
  }
  catch {
    return null
  }
  const next = pickWhitelisted(props, WHITELIST.script)
  acceptDataAttrs(props, next)
  next.textContent = json
  return next
}

function safeAttrs(props: Record<string, any>, type: 'htmlAttrs' | 'bodyAttrs'): Record<string, any> | null {
  const next = pickWhitelisted(props, WHITELIST[type])
  // no id on html/body (DOM clobbering)
  acceptDataAttrs(props, next, false)
  return Object.keys(next).length ? next : null
}

// content-stripped tag families: props allowlist only, innerHTML/textContent never survive
function safeContentless(props: Record<string, any>, allow: ReadonlySet<string>): Record<string, any> | null {
  const next = pickWhitelisted(props, allow)
  acceptDataAttrs(props, next)
  return Object.keys(next).length ? next : null
}

function asObject(v: unknown): Record<string, any> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : null
}

function filterArray(value: unknown, fn: (props: Record<string, any>) => Record<string, any> | null): Record<string, any>[] {
  const out: Record<string, any>[] = []
  for (const item of Array.isArray(value) ? value : [value]) {
    const props = asObject(item)
    if (!props)
      continue
    const safe = fn(props)
    if (safe)
      out.push(safe)
  }
  return out
}

/**
 * Filter resolved head input down to the safe allowlist. Pure function: refs
 * and getters must be resolved first (the useHeadSafe composable runs it after
 * walkResolver, inside the reactive effect).
 */
export function sanitizeSafeInput(input: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  if (!input || typeof input !== 'object')
    return out
  for (const key in input) {
    const value = input[key]
    if (value === undefined || value === null)
      continue
    switch (key) {
      // title text is escaped at render; titleTemplate renders through the same
      // escaped title path
      case 'title':
      case 'titleTemplate':
        out[key] = value
        break
      case 'meta':
        out.meta = filterArray(value, safeMeta)
        break
      case 'link':
        out.link = filterArray(value, safeLink)
        break
      case 'script':
        out.script = filterArray(value, safeScript)
        break
      case 'style':
        out.style = filterArray(value, p => safeContentless(p, WHITELIST.style))
        break
      case 'noscript':
        out.noscript = filterArray(value, p => safeContentless(p, WHITELIST.noscript))
        break
      case 'htmlAttrs':
      case 'bodyAttrs': {
        const props = asObject(value)
        const safe = props && safeAttrs(props, key)
        if (safe)
          out[key] = safe
        break
      }
      // base, templateParams and anything unknown are dropped
    }
  }
  return out
}
