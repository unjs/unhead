/**
 * Demo-local sealed client runtime over the v4 PlanTag wire format.
 *
 * Why this exists: the v4 prototype's client renderer (src/v4/client.ts) has
 * no F_PREBUILT branch. revivePlan() leaves the type-id bits of `f` at zero
 * for head-position tuples, so a prebuilt plan tag pushed on the client hits
 * the `id === T_TITLE` fast path and writes raw HTML into document.title.
 * Plans are currently a server-only concept. This file is the ~40-line
 * client the compiled-app story implies: static tuples stay inert SSR HTML,
 * hole tuples patch their one dynamic value straight onto the adopted
 * element. It consumes the exact plan emitted by emit.ts at build time.
 *
 * Supports one hole per tuple (all the demo plan needs); hole values are
 * written raw via DOM APIs (escaping is an HTML-serialization concern).
 */

export type PlanTag = [number, string, string | string[], number?, number?]

interface Slot {
  d: string
  /** attribute the hole fills; null = title text */
  attr: string | null
  /** fill cursor index (left-to-right across the plan) */
  at: number
}

const ATTR_RE = /([\w:-]+)="$/

export function createSealedHead(plan: PlanTag[], fills: unknown[]) {
  const slots: Slot[] = []
  let at = 0
  for (const t of plan) {
    const seg = t[2]
    if (typeof seg === 'string')
      continue
    const m = ATTR_RE.exec(seg[0])
    slots.push({ d: t[1], attr: m ? m[1] : null, at })
    at += seg.length - 1
  }

  // adopt SSR elements for hole-bearing identities only
  const els = new Map<string, Element>()
  for (const el of document.head.children) {
    const n = el.tagName
    if (n === 'META') {
      const k = el.getAttribute('name') || el.getAttribute('property')
      if (k)
        els.set(`meta:${k}`, el)
    }
    else if (n === 'LINK' && el.getAttribute('rel') === 'canonical') {
      els.set('canonical', el)
    }
  }

  let prev: unknown[] | null = fills // SSR already rendered the initial fills
  return {
    patch(next: unknown[]) {
      for (const s of slots) {
        if (prev && prev[s.at] === next[s.at])
          continue
        const v = String(next[s.at] ?? '')
        if (!s.attr)
          document.title = v
        else
          els.get(s.d)?.setAttribute(s.attr, v)
      }
      prev = next
    },
  }
}
