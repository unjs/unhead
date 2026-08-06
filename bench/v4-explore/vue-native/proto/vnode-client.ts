/**
 * Prototype: @vue/runtime-dom as the head DOM renderer for the vue adapter.
 *
 * Strategy under test: resolve tags -> vnode list -> `render(Fragment, host)`
 * where the hosts are document.head / body-open / body-close anchors.
 * htmlAttrs/bodyAttrs are not elements and cannot be vnodes; they keep a
 * hand-rolled path here (which is already most of the v4 attr code).
 */
import type { Tag } from '../../../../packages/unhead/src/v4/core'
import { createVNode, Fragment, h, render } from 'vue'
import { hashTag } from '../../../../packages/unhead/src/v4/client'
import {
  F_ID,
  F_POS,
  F_RAW,
  F_REMOVED,
  INNER_CONTENT,
  POS_SHIFT,
  T_BODY_ATTRS,
  T_HTML_ATTRS,
  T_TITLE,
  T_TITLE_TEMPLATE,
  TAG_NAMES,
} from '../../../../packages/unhead/src/v4/core'

function tagToVNode(t: Tag, dupes: Record<string, number>) {
  const id = t.f & F_ID
  const props: Record<string, any> = {}
  if (t.p) {
    for (const k in t.p) {
      const v = t.p[k]
      props[k] = v instanceof Set
        ? [...v].join(' ')
        : v instanceof Map
          ? Object.fromEntries(v)
          : v
    }
  }
  if (t.c != null && (INNER_CONTENT >> id & 1))
    props[t.f & F_RAW ? 'innerHTML' : 'textContent'] = t.c
  const base = t.d || hashTag(t)
  const nth = dupes[base] || 0
  dupes[base] = nth + 1
  props.key = nth ? `${base}:${nth}` : base
  return h(TAG_NAMES[id], props)
}

export interface VueDomRenderer {
  apply: (tags: Tag[], doc: Document) => void
  dispose: (doc: Document) => void
}

export function createVueDomRenderer(): VueDomRenderer {
  // body buckets render into anchor containers so vue's Fragment anchors
  // do not litter <body>; head renders straight into document.head
  let bodyOpenHost: Element | null = null
  let bodyCloseHost: Element | null = null

  return {
    apply(tags, doc) {
      const buckets: any[][] = [[], [], []]
      const dupes: Record<string, number> = Object.create(null)
      for (const t of tags) {
        const f = t.f
        if (f & F_REMOVED)
          continue
        const id = f & F_ID
        if (id === T_TITLE_TEMPLATE)
          continue
        if (id === T_TITLE) {
          if (doc.title !== t.c)
            doc.title = t.c ?? ''
          continue
        }
        // not representable as vnodes: patch attrs by hand (same code the
        // v4 client already carries; vue saves nothing here)
        if (id === T_HTML_ATTRS || id === T_BODY_ATTRS) {
          const el = id === T_HTML_ATTRS ? doc.documentElement : doc.body
          const p = t.p!
          for (const k in p) {
            if (k === 'class') {
              el.classList.add(p[k])
            }
            else if (k === 'style') {
              const ci = (p[k] as string).indexOf(':')
              ;(el as HTMLElement).style.setProperty(p[k].slice(0, ci), p[k].slice(ci + 1))
            }
            else if (p[k] !== false && p[k] !== null) {
              el.setAttribute(k, p[k] === true ? '' : String(p[k]))
            }
          }
          continue
        }
        buckets[(f & F_POS) >> POS_SHIFT].push(tagToVNode(t, dupes))
      }

      render(createVNode(Fragment, null, buckets[0]), doc.head as any)
      if (buckets[1].length || bodyOpenHost) {
        if (!bodyOpenHost) {
          bodyOpenHost = doc.createElement('unhead-body-open')
          doc.body.insertBefore(bodyOpenHost, doc.body.firstChild)
        }
        render(createVNode(Fragment, null, buckets[1]), bodyOpenHost as any)
      }
      if (buckets[2].length || bodyCloseHost) {
        if (!bodyCloseHost) {
          bodyCloseHost = doc.createElement('unhead-body-close')
          doc.body.appendChild(bodyCloseHost)
        }
        render(createVNode(Fragment, null, buckets[2]), bodyCloseHost as any)
      }
    },
    dispose(doc) {
      render(null, doc.head as any)
      bodyOpenHost && render(null, bodyOpenHost as any)
      bodyCloseHost && render(null, bodyCloseHost as any)
    },
  }
}
