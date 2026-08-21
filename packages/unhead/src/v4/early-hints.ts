/** @experimental v4 preview surface: semver-exempt until v4 stabilizes. See packages/unhead/V4_DESIGN.md. */
/**
 * v4: 103 Early Hints adapter (`unhead/server/early-hints`).
 * Extracts the hintable link set from a live head or a build-time static plan
 * and formats RFC 8297 Link header values. The tags stay in the head: 103 is
 * advisory. See packages/unhead/V4_DESIGN.md section 11.
 */
import type { PlanTag, V4Head } from './core'
import { F_ID, F_PREBUILT, F_REMOVED, T_LINK } from './core'

// only rels worth sending before the response body; modulepreload maps to
// preload (Link headers have no module graph semantics)
const HINT_RELS: Record<string, string> = { preload: 'preload', modulepreload: 'preload', preconnect: 'preconnect' }
// params carried through when present, in emit order
const CARRY = ['as', 'crossorigin', 'type', 'fetchpriority']
// RFC 7230 tchar: emit bare; otherwise quoted-string; otherwise drop the param
const TOKEN_RE = /^[\w!#$%&'*+.^`|~-]+$/
// eslint-disable-next-line no-control-regex
const BAD_PARAM_RE = /["\\\u0000-\u001F\u007F]/
// header injection guard: a crafted href must never smuggle CTLs into the header
// eslint-disable-next-line no-control-regex
const CTL_RE = /[\u0000-\u001F\u007F]/
// RFC 3986 chars that pass through; everything else (spaces, <>", unicode)
// gets percent-encoded so the <URI-Reference> delimiters stay unambiguous
const URI_UNSAFE_RE = /[^\w\-.~!#$&'()*+,/:;=?@%[\]]/gu
const SCHEME_RE = /^\s*(?:data|javascript):/i
// attrs exactly as the v4 compiler emits them (propsToString/tagToHtml):
// space-separated, values double-quoted with `"` as &quot;, booleans bare.
// only ever run on strings the compiler itself produced.
const ATTR_RE = /(?:^|\s)([a-z][\w-]*)(?:="([^"]*)")?/gi
const QUOT_ENT_RE = /&quot;/g

type Attrs = Record<string, unknown>

function parseLinkHtml(html: string): Attrs {
  const attrs: Attrs = Object.create(null)
  const s = html.slice(5, html.indexOf('>'))
  ATTR_RE.lastIndex = 0
  let m = ATTR_RE.exec(s)
  while (m) {
    attrs[m[1].toLowerCase()] = m[2] === undefined ? true : m[2].replace(QUOT_ENT_RE, '"')
    m = ATTR_RE.exec(s)
  }
  return attrs
}

/** Format one link's attrs as an RFC 8297 Link value, or null when not hintable. */
function toHint(attrs: Attrs): [key: string, value: string] | null {
  const rel = HINT_RELS[attrs.rel as string]
  const href = attrs.href
  if (!rel || typeof href !== 'string' || !href)
    return null
  // CSP-bound links are meaningless (and leaky) outside the document
  if (attrs.nonce != null && attrs.nonce !== false)
    return null
  // defensive: non-fetchable schemes and CTL-bearing hrefs are dropped, not encoded
  if (SCHEME_RE.test(href) || CTL_RE.test(href))
    return null
  const uri = href.replace(URI_UNSAFE_RE, encodeURIComponent)
  let out = `<${uri}>; rel=${rel}`
  for (const k of CARRY) {
    const v = attrs[k]
    if (v === undefined || v === null || v === false)
      continue
    if (v === true || v === '') {
      out += `; ${k}`
      continue
    }
    const s = String(v)
    if (TOKEN_RE.test(s))
      out += `; ${k}=${s}`
    else if (!BAD_PARAM_RE.test(s))
      out += `; ${k}="${s}"`
  }
  return [`${rel} ${uri}`, out]
}

/**
 * Hintable Link header values, capo-ordered and deduped by href+rel.
 * Accepts a live head (per-request path) or a static plan (build-time path:
 * the hint set is knowable per route with zero resolve).
 */
export function toEarlyHints(source: V4Head | PlanTag[]): string[] {
  const out: string[] = []
  const seen: Record<string, 1> = Object.create(null)
  const add = (attrs: Attrs) => {
    const hint = toHint(attrs)
    if (hint && !seen[hint[0]]) {
      seen[hint[0]] = 1
      out.push(hint[1])
    }
  }
  if (Array.isArray(source)) {
    // holes (segment tuples) need fills, so only fully static tuples qualify
    const links = source.filter(t => typeof t[2] === 'string' && (t[2] as string).startsWith('<link'))
    links.sort((a, b) => a[0] - b[0]) // capo weight; Array#sort is stable
    for (const t of links) add(parseLinkHtml(t[2] as string))
  }
  else {
    // resolve() output is already weight-sorted and deduped by identity
    for (const t of source.resolve()) {
      if (t.f & F_REMOVED)
        continue
      if (t.f & F_PREBUILT) {
        if (t.c && t.c.startsWith('<link'))
          add(parseLinkHtml(t.c))
      }
      else if ((t.f & F_ID) === T_LINK && t.p) {
        add(t.p)
      }
    }
  }
  return out
}

/** Same set as a single Link header, for Cloudflare's automatic 103 conversion. */
export function toLinkHeader(source: V4Head | PlanTag[]): string {
  return toEarlyHints(source).join(', ')
}
