import type { Tag, V4Head } from '../../../packages/unhead/src/v4/core'
/**
 * SSR variants for the hydration exploration: copies of server.ts
 * renderSSRHead that additionally emit adoption markers.
 *
 * - renderSSRHeadMarked: data-h="<identity>" attribute per element tag
 * - renderSSRHeadManifest: one script[type=application/json] carrying the
 *   per-bucket identity arrays in emit order (V4_DESIGN.md 11 claims-table)
 * - renderSSRHeadRanged: comment range around each bucket, for the no-adopt
 *   replace strategy
 */
import type { SSRPayload } from '../../../packages/unhead/src/v4/server'
import {
  F_ID,
  F_POS,
  F_PREBUILT,
  F_REMOVED,
  POS_SHIFT,
  SELF_CLOSING,
  T_BODY_ATTRS,
  T_HTML_ATTRS,
  T_TITLE,
  T_TITLE_TEMPLATE,
  TAG_NAMES,
} from '../../../packages/unhead/src/v4/core'
import { propsToString, tagToHtml } from '../../../packages/unhead/src/v4/server'

export const MANIFEST_ID = 'uh-m'
export const RANGE_OPEN = '[uh'
export const RANGE_CLOSE = 'uh]'

const QUOT_RE = /"/g
const escAttr = (s: string) => s.includes('"') ? s.replace(QUOT_RE, '&quot;') : s

// same algorithm as the client's hashTag; both sides hash the compile output
// of the same entry input, so the strings agree without any DOM parsing.
// Caveat: class/style props (Set/Map) would stringify uselessly; element tags
// carrying class/style must rely on `d` identity or per-element markers.
function serverHashTag(t: Tag): string {
  let h = TAG_NAMES[t.f & F_ID]
  if (t.p) {
    for (const k of Object.keys(t.p).sort()) h += `,${k}:${t.p[k]}`
  }
  if (t.c)
    h += `,c:${t.c}`
  return h
}

function tagKey(t: Tag, dupes: Record<string, number>): string {
  const base = t.d || serverHashTag(t)
  const nth = dupes[base] || 0
  dupes[base] = nth + 1
  return nth ? `${base}:${nth}` : base
}

// tagToHtml with the marker attr spliced into the open tag
function tagToHtmlMarked(t: Tag, key: string): string {
  const id = t.f & F_ID
  const name = TAG_NAMES[id]
  const open = `<${name}${t.p ? propsToString(t.p) : ''} data-h="${escAttr(key)}">`
  return (SELF_CLOSING >> id & 1) ? open : `${open}${t.c ?? ''}</${name}>`
}

/**
 * Shared bucket walk (verbatim from server.ts renderSSRHead), with the
 * element-tag serialization injected per strategy.
 */
function render(head: V4Head, emitTag: (t: Tag, id: number, pos: number, dupes: Record<string, number>) => string): { buckets: string[], bags: (Record<string, any> | null)[] } {
  const tags = head.resolve()
  const buckets = ['', '', '']
  const bags: (Record<string, any> | null)[] = [null, null]
  const dupes: Record<string, number> = Object.create(null)

  for (let i = 0; i < tags.length; i++) {
    const t = tags[i]
    const f = t.f
    if (f & F_REMOVED)
      continue
    const id = f & F_ID

    if (id === T_HTML_ATTRS || id === T_BODY_ATTRS) {
      const bag = bags[id - T_HTML_ATTRS] ||= {}
      let p = t.p
      if (f & F_PREBUILT) {
        const c = t.c!
        const eq = c.indexOf('="')
        p = eq < 0 ? { [c.slice(1)]: true } : { [c.slice(1, eq)]: c.slice(eq + 2, -1) }
      }
      for (const k in p!) {
        if (k === 'class' || k === 'style')
          bag[k] = bag[k] ? `${bag[k]}${k === 'class' ? ' ' : ';'}${p![k]}` : p![k]
        else
          bag[k] = p![k]
      }
      continue
    }
    if (id === T_TITLE_TEMPLATE)
      continue

    buckets[(f & F_POS) >> POS_SHIFT] += emitTag(t, id, (f & F_POS) >> POS_SHIFT, dupes)
  }
  return { buckets, bags }
}

function toPayload(buckets: string[], bags: (Record<string, any> | null)[]): SSRPayload {
  return {
    headTags: buckets[0],
    bodyTags: buckets[2],
    bodyTagsOpen: buckets[1],
    htmlAttrs: bags[0] ? propsToString(bags[0]) : '',
    bodyAttrs: bags[1] ? propsToString(bags[1]) : '',
  }
}

/** 3a: per-element data-h marker. Title is skipped (client handles it via document.title). */
export function renderSSRHeadMarked(head: V4Head): SSRPayload {
  const { buckets, bags } = render(head, (t, id, _pos, dupes) => {
    if (id === T_TITLE)
      return t.f & F_PREBUILT ? t.c! : tagToHtml(t)
    const key = tagKey(t, dupes)
    if (t.f & F_PREBUILT) {
      // prebuilt plan tags carry final html; splice the marker before the
      // first `>` (safe for plan-emitted defaults; a real emitter would
      // stamp the marker at plan build time instead)
      return t.c!.replace('>', ` data-h="${escAttr(key)}">`)
    }
    return tagToHtmlMarked(t, key)
  })
  return toPayload(buckets, bags)
}

/** 3b: single inline manifest of identity keys per bucket, in emit order. */
export function renderSSRHeadManifest(head: V4Head): SSRPayload {
  const keys: string[][] = [[], [], []]
  const { buckets, bags } = render(head, (t, _id, pos, dupes) => {
    // every emitted element gets a slot (title included) so the client's
    // lockstep walk stays aligned with children order
    keys[pos].push(tagKey(t, dupes))
    return t.f & F_PREBUILT ? t.c! : tagToHtml(t)
  })
  const json = JSON.stringify({ h: keys[0], o: keys[1], c: keys[2] }).replace(/</g, '\\u003C')
  buckets[0] += `<script type="application/json" id="${MANIFEST_ID}">${json}</script>`
  return toPayload(buckets, bags)
}

/** 4: comment range per bucket, for no-adopt replace. */
export function renderSSRHeadRanged(head: V4Head): SSRPayload {
  const { buckets, bags } = render(head, t => t.f & F_PREBUILT ? t.c! : tagToHtml(t))
  for (let i = 0; i < 3; i++) {
    if (buckets[i])
      buckets[i] = `<!--${RANGE_OPEN}-->${buckets[i]}<!--${RANGE_CLOSE}-->`
  }
  return toPayload(buckets, bags)
}
