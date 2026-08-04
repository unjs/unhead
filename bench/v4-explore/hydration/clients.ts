/**
 * Adoption strategies under test. Each factory returns a head whose render
 * pipeline is identical (client-core.ts); only the way SSR elements are
 * claimed differs.
 *
 * - baseline: real packages/unhead/src/v4/client.ts (imported by the bench
 *   directly, not built here)
 * - eager: baseline's hash adopt, paid at createHead instead of first flush
 * - exact: lazy adopt with compile.ts identity() ported over DOM props
 *   (fixes base + alternate-hreflang; keyed metas stay unfixable because SSR
 *   HTML carries no key for metas)
 * - marker: server stamps data-h="<identity>" per element; client adopts via
 *   one querySelectorAll, zero DOM prop reads, zero hashing
 * - manifest: server appends one script[type=application/json] holding the
 *   per-bucket identity arrays; client zips head/body children in lockstep
 * - noadopt: server wraps buckets in comment ranges; client removes the whole
 *   range on first flush and renders fresh elements
 */
import type { AdoptFn, CreateVariantHeadOptions, VariantHead } from './client-core'
import {
  T_BASE,
  T_BODY_ATTRS,
  T_HTML_ATTRS,
  T_LINK,
  T_META,
  T_NOSCRIPT,
  T_STYLE,
  T_TITLE,
  TAG_NAMES,
} from '../../../packages/unhead/src/v4/core'
import { createVariantHead, hashTag } from './client-core'
import { MANIFEST_ID, RANGE_CLOSE, RANGE_OPEN } from './servers'

// ---------------------------------------------------------------------------
// baseline hash adopt (verbatim port of client.ts adopt + domIdentity)

function domIdentityHash(id: number, p: Record<string, any>, c: string | null): string {
  const name = TAG_NAMES[id]
  if (p.charset)
    return 'charset'
  if (id === T_META) {
    const v = p.name ?? p.property ?? p['http-equiv']
    if (v !== undefined)
      return `meta:${v}`
  }
  const hid = p['data-hid']
  if (hid)
    return `${name}:key:${hid}`
  if (p.id)
    return `${name}:id:${p.id}`
  if (id === T_LINK) {
    if (p.rel === 'canonical')
      return 'canonical'
    if (p.rel && p.href)
      return `link:${p.rel}:${p.href}`
  }
  return c && id >= T_STYLE && id <= T_NOSCRIPT ? `${name}:content:${c}` : ''
}

function makeScanAdopt(domIdentity: (id: number, p: Record<string, any>, c: string | null) => string): AdoptFn {
  return (doc, els) => {
    for (const el of [...doc.head.children, ...doc.body.children]) {
      const id = TAG_NAMES.indexOf(el.tagName.toLowerCase() as any)
      if (id < 0 || id === T_HTML_ATTRS || id === T_BODY_ATTRS || id === T_TITLE)
        continue
      const p: Record<string, any> = {}
      for (const a of el.getAttributeNames()) {
        const v = el.getAttribute(a)
        p[a] = v === '' ? true : v
      }
      const c = el.innerHTML || null
      const key = domIdentity(id, p, c) || hashTag({ f: id, w: 0, o: 0, d: '', p, c })
      let k = key
      let n = 1
      while (els.has(k)) k = `${key}:${n++}`
      els.set(k, el)
    }
  }
}

const adoptHash = /* @__PURE__ */ makeScanAdopt(domIdentityHash)

// ---------------------------------------------------------------------------
// exact identity adopt: full port of compile.ts identity() over DOM props,
// with data-hid standing in for `key`. Check order mirrors identity() exactly.
// Keyed metas adopt too since compile emits data-hid on them (was a gap:
// SSR HTML used to carry no key for metas). This is what shipped in
// client.ts, which now imports identity() directly.

const META_NOREWRITE_RE = /^(?:viewport|description|keywords|robots)$/

function domIdentityExact(id: number, p: Record<string, any>, c: string | null): string {
  const name = TAG_NAMES[id]
  if (id === T_BASE)
    return name
  if (id === T_LINK) {
    if (p.rel === 'canonical')
      return 'canonical'
    if (p.rel === 'alternate' && p.hreflang)
      return `alternate:${p.hreflang}`
  }
  if (p.charset)
    return 'charset'
  const key = p['data-hid']
  if (id === T_META) {
    const v = p.name ?? p.property ?? p['http-equiv']
    if (v !== undefined)
      return `meta:${v}${(typeof v !== 'string' || !v.includes(':')) && !META_NOREWRITE_RE.test(v) && key ? `:key:${key}` : ''}`
  }
  if (key)
    return `${name}:key:${key}`
  if (p.id)
    return `${name}:id:${p.id}`
  if (id === T_LINK && p.rel && p.href)
    return `link:${p.rel}:${p.href}`
  return c && id >= T_STYLE && id <= T_NOSCRIPT ? `${name}:content:${c}` : ''
}

const adoptExact = /* @__PURE__ */ makeScanAdopt(domIdentityExact)

// ---------------------------------------------------------------------------
// marker adopt: the attr carries the exact compile-side identity (dupe suffix
// baked in by the server), so adoption is one query + one attr read per
// element. No tag-name checks, no prop scans, no hashing, no sorting.

const adoptMarker: AdoptFn = (doc, els) => {
  const marked = doc.querySelectorAll('[data-h]')
  for (let i = 0; i < marked.length; i++) {
    const el = marked[i]
    els.set(el.getAttribute('data-h')!, el)
  }
}

// ---------------------------------------------------------------------------
// manifest adopt: one JSON script holds per-bucket identity arrays in emit
// order; elements are claimed positionally (head children lockstep, bodyOpen
// from the front, bodyClose from the back). Assumes nothing foreign was
// injected between SSR elements; a production impl needs a dev-mode tag-name
// check per slot (Svelte's silent-skip lesson, V4_DESIGN.md 5.1).

const adoptManifest: AdoptFn = (doc, els) => {
  const m = doc.getElementById(MANIFEST_ID)
  if (!m)
    return
  const { h, o, c } = JSON.parse(m.textContent!) as { h: string[], o: string[], c: string[] }
  let i = 0
  for (const el of doc.head.children) {
    if (el === m)
      continue
    if (i >= h.length)
      break
    els.set(h[i++], el)
  }
  const bc = doc.body.children
  for (let j = 0; j < o.length; j++) els.set(o[j], bc[j])
  const start = bc.length - c.length
  for (let j = 0; j < c.length; j++) els.set(c[j], bc[start + j])
}

// ---------------------------------------------------------------------------
// no-adopt replace: remove everything between the SSR comment ranges, adopt
// nothing; the first flush recreates every client-pushed element fresh.
// SSR-only tags the client never pushes (server defaults: charset, viewport)
// are LOST. Scripts are re-created (re-executed in a real browser) and
// stylesheets get remove+reinsert flicker; see hydrate.test.ts.

function clearRange(parent: Node) {
  const kids = parent.childNodes
  const toRemove: ChildNode[] = []
  let removing = false
  for (let i = 0; i < kids.length; i++) {
    const n = kids[i] as ChildNode
    if (n.nodeType === 8 /* comment */) {
      if (n.nodeValue === RANGE_OPEN) {
        removing = true
        toRemove.push(n)
        continue
      }
      if (n.nodeValue === RANGE_CLOSE) {
        removing = false
        toRemove.push(n)
        continue
      }
    }
    if (removing)
      toRemove.push(n)
  }
  for (const n of toRemove) n.remove()
}

const adoptClear: AdoptFn = (doc) => {
  clearRange(doc.head)
  clearRange(doc.body)
}

// ---------------------------------------------------------------------------

// exported for the adoption-step-only microbench
export { adoptClear, adoptExact, adoptHash, adoptManifest, adoptMarker }

export const createEagerHead = (o: CreateVariantHeadOptions): VariantHead => createVariantHead(o, { adopt: adoptHash, eager: true })
export const createExactHead = (o: CreateVariantHeadOptions): VariantHead => createVariantHead(o, { adopt: adoptExact })
export const createMarkerHead = (o: CreateVariantHeadOptions): VariantHead => createVariantHead(o, { adopt: adoptMarker })
export const createManifestHead = (o: CreateVariantHeadOptions): VariantHead => createVariantHead(o, { adopt: adoptManifest })
export const createNoAdoptHead = (o: CreateVariantHeadOptions): VariantHead => createVariantHead(o, { adopt: adoptClear })
