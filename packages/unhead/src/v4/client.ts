/**
 * v4 client: DOM renderer + createHead.
 * Contracts from V4_DESIGN.md 5.1: zero work until first mutation (no init
 * scan; adoption happens lazily inside the first flush), never reorder
 * existing elements (w is an SSR concern), side effects tracked as data
 * records undone by a switch, renders batched on a microtask.
 */
import type { EntryOptions, Tag, V4Head } from './core'
import { compileEntry, TitlePlugin } from './compile'
import {
  createCore,
  F_ID,
  F_POS,
  F_REMOVED,
  INNER_CONTENT,
  POS_SHIFT,
  T_BODY_ATTRS,
  T_HTML_ATTRS,
  T_TITLE,
  T_TITLE_TEMPLATE,
  TAG_NAMES,
} from './core'

// side-effect kinds; records are [kind, target, key] tuples in a keyed map
const FX_ATTR = 0
const FX_CLASS = 1
const FX_STYLE = 2
const FX_TEXT = 3
const FX_HTML = 4
const FX_EL = 5
const FX_TITLE = 6
const FX_EVT = 7

type Fx = [number, any, string]

interface DomState {
  adopted: boolean
  els: Map<string, Element>
  fx: Map<string, Fx>
  listeners: Map<string, [EventTarget, string, EventListener, EventListener]>
  title: string
}

export interface ClientHead extends V4Head {
  render: () => boolean
  dirty: boolean
  _doc: Document
  _dom: DomState | null
}

export interface CreateClientHeadOptions {
  document?: Document
  /** injectable scheduler seam: sync test flushes, view-transition alignment */
  scheduler?: (flush: () => void) => void
  disableDefaults?: boolean
}

const hashCache = /* @__PURE__ */ new WeakMap<Tag, string>()

// fallback identity for positionally-unique tags, DOM adoption only
function hashTag(t: Tag): string {
  let h = hashCache.get(t)
  if (h === undefined) {
    h = TAG_NAMES[t.f & F_ID]
    if (t.p) {
      for (const k of Object.keys(t.p).sort()) h += `,${k}:${t.p[k]}`
    }
    if (t.c)
      h += `,c:${t.c}`
    hashCache.set(t, h)
  }
  return h
}

const TAG_IDS: Record<string, number> = /* @__PURE__ */ (() => {
  const m: Record<string, number> = Object.create(null)
  for (let i = 0; i < TAG_NAMES.length; i++) m[TAG_NAMES[i]] = i
  return m
})()

// lazy adoption: index existing (SSR-rendered) elements by the same identity
// rules the compiler uses, so the first flush reuses them instead of duplicating
function adopt(doc: Document, els: Map<string, Element>) {
  for (const el of [...doc.head.children, ...doc.body.children]) {
    const name = el.tagName.toLowerCase()
    const id = TAG_IDS[name]
    if (id === undefined || id === T_HTML_ATTRS || id === T_BODY_ATTRS || id === T_TITLE)
      continue
    const p: Record<string, any> = {}
    for (const a of el.getAttributeNames()) p[a] = el.getAttribute(a) === '' ? true : el.getAttribute(a)
    const c = el.innerHTML || null
    const pseudo: Tag = { f: id, w: 0, o: 0, d: '', p, c }
    // recompute identity from DOM state; compile identity rules are in compile.ts,
    // duplicated minimally here via the pseudo-tag hash + common fast paths
    const key = domIdentity(id, p, c, (el.getAttribute('data-hid') as string | null)) || hashTag(pseudo)
    let k = key
    let n = 1
    while (els.has(k)) k = `${key}:${n++}`
    els.set(k, el)
  }
}

// mirror of compile.ts identity() over adopted DOM props (kept tiny; hash covers the rest)
function domIdentity(id: number, p: Record<string, any>, c: string | null, hid: string | null): string {
  const name = TAG_NAMES[id]
  if (p.charset)
    return 'charset'
  if (id === TAG_IDS.meta) {
    const v = p.name ?? p.property ?? p['http-equiv']
    if (v !== undefined)
      return `meta:${v}`
  }
  if (hid)
    return `${name}:key:${hid}`
  if (p.id)
    return `${name}:id:${p.id}`
  if (id === TAG_IDS.link) {
    if (p.rel === 'canonical')
      return 'canonical'
    if (p.rel && p.href)
      return `link:${p.rel}:${p.href}`
  }
  if (c && (id >= TAG_IDS.style && id <= TAG_IDS.noscript))
    return `${name}:content:${c}`
  return ''
}

function undoFx(r: Fx, state: DomState, doc: Document) {
  const [kind, t, k] = r
  switch (kind) {
    case FX_ATTR: (t as Element).removeAttribute(k)
      break
    case FX_CLASS: (t as Element).classList.remove(k)
      break
    case FX_STYLE: (t as HTMLElement).style.removeProperty(k)
      break
    case FX_TEXT: (t as Element).textContent === k && ((t as Element).textContent = '')
      break
    case FX_HTML: (t as Element).innerHTML === k && ((t as Element).innerHTML = '')
      break
    case FX_EL: (t as Element).remove()
      state.els.delete(k)
      break
    case FX_TITLE: doc.title = k
      break
    case FX_EVT: {
      const l = state.listeners.get(k)
      if (l) {
        l[0].removeEventListener(l[1], l[3])
        state.listeners.delete(k)
      }
      break
    }
  }
}

function renderDOM(head: ClientHead): boolean {
  const doc = head._doc
  if (!doc)
    return false
  head.dirty = false
  let state = head._dom
  if (!state) {
    state = head._dom = { adopted: false, els: new Map(), fx: new Map(), listeners: new Map(), title: doc.title }
    adopt(doc, state.els)
    state.adopted = true
  }
  const prev = state.fx
  const next = new Map<string, Fx>()
  const track = (key: string, kind: number, target: any, data: string) => {
    next.set(key, prev.get(key) || [kind, target, data])
    prev.delete(key)
  }

  const tags = head.resolve()
  const dupes: Record<string, number> = Object.create(null)
  let headFrag: DocumentFragment | null = null
  let openFrag: DocumentFragment | null = null
  let closeFrag: DocumentFragment | null = null

  for (let i = 0; i < tags.length; i++) {
    const t = tags[i]
    const f = t.f
    if (f & F_REMOVED)
      continue
    const id = f & F_ID
    if (id === T_TITLE_TEMPLATE)
      continue

    if (id === T_TITLE) {
      if (doc.title !== t.c)
        doc.title = t.c ?? ''
      track('title', FX_TITLE, null, state.title)
      continue
    }

    // per-prop attr tags apply directly to documentElement/body
    if (id === T_HTML_ATTRS || id === T_BODY_ATTRS) {
      const el = id === T_HTML_ATTRS ? doc.documentElement : doc.body
      const p = t.p!
      for (const k in p) {
        const v = p[k]
        if (k === 'class') {
          track(`${TAG_NAMES[id]}:c:${v}`, FX_CLASS, el, v)
          el.classList.contains(v) || el.classList.add(v)
        }
        else if (k === 'style') {
          const ci = (v as string).indexOf(':')
          const sk = (v as string).slice(0, ci)
          track(`${TAG_NAMES[id]}:s:${sk}`, FX_STYLE, el, sk)
          ;(el as HTMLElement).style.setProperty(sk, (v as string).slice(ci + 1))
        }
        else if (k[0] === 'o' && k[1] === 'n' && typeof v === 'function') {
          bindEvent(state, next, prev, `${TAG_NAMES[id]}:e:${k}`, el, k.slice(2), v, id === T_BODY_ATTRS ? doc.defaultView || el : el)
        }
        else if (v !== false && v !== null) {
          track(`${TAG_NAMES[id]}:a:${k}`, FX_ATTR, el, k)
          const sv = v === true ? '' : String(v)
          el.getAttribute(k) !== sv && el.setAttribute(k, sv)
        }
      }
      continue
    }

    // element tags: adopt by identity, else create and append in resolve order
    const base = t.d || hashTag(t)
    const nth = dupes[base] || 0
    dupes[base] = nth + 1
    const key = nth ? `${base}:${nth}` : base
    let el = state.els.get(key)
    const fresh = !el
    if (!el) {
      el = doc.createElement(TAG_NAMES[id])
      state.els.set(key, el)
    }
    track(`${key}:el`, FX_EL, el, key)

    if (t.p) {
      for (const k in t.p) {
        const v = t.p[k]
        if (k[0] === 'o' && k[1] === 'n' && typeof v === 'function') {
          bindEvent(state, next, prev, `${key}:e:${k}`, el, k.slice(2), v, el)
          continue
        }
        if (v === false || v === null)
          continue
        if (k === 'class') {
          for (const c of v as Set<string>) {
            track(`${key}:c:${c}`, FX_CLASS, el, c)
            el.classList.contains(c) || el.classList.add(c)
          }
        }
        else if (k === 'style') {
          for (const [sk, sv] of v as Map<string, string>) {
            track(`${key}:s:${sk}`, FX_STYLE, el, sk)
            ;(el as HTMLElement).style.setProperty(sk, sv)
          }
        }
        else {
          track(`${key}:a:${k}`, FX_ATTR, el, k)
          const sv = v === true ? '' : String(v)
          el.getAttribute(k) !== sv && el.setAttribute(k, sv)
        }
      }
    }
    if (t.c != null && (INNER_CONTENT >> id & 1)) {
      if (f & 64) { // F_RAW
        el.innerHTML !== t.c && (el.innerHTML = t.c)
        track(`${key}:h`, FX_HTML, el, t.c)
      }
      else {
        el.textContent !== t.c && (el.textContent = t.c)
        track(`${key}:t`, FX_TEXT, el, t.c)
      }
    }
    if (fresh) {
      // append-only: new elements go at the end of their bucket, existing
      // elements are never moved (w ordering is an SSR-emit concern)
      const pos = (f & F_POS) >> POS_SHIFT
      const frag = pos === 0
        ? (headFrag ||= doc.createDocumentFragment())
        : pos === 1 ? (openFrag ||= doc.createDocumentFragment()) : (closeFrag ||= doc.createDocumentFragment())
      frag.appendChild(el)
    }
  }

  if (headFrag)
    doc.head.appendChild(headFrag)
  if (openFrag)
    doc.body.insertBefore(openFrag, doc.body.firstChild)
  if (closeFrag)
    doc.body.appendChild(closeFrag)

  // anything tracked last render and not re-tracked gets undone
  for (const r of prev.values()) undoFx(r, state, doc)
  state.fx = next
  return true
}

function bindEvent(state: DomState, next: Map<string, Fx>, prev: Map<string, Fx>, key: string, el: Element, ev: string, src: any, target: EventTarget) {
  const existing = state.listeners.get(key)
  if (existing && existing[2] === src) {
    next.set(key, prev.get(key) || [FX_EVT, null, key])
    prev.delete(key)
    return
  }
  if (existing)
    existing[0].removeEventListener(existing[1], existing[3])
  const bound = ((e: Event) => src.call(el, e)) as EventListener
  target.addEventListener(ev, bound)
  state.listeners.set(key, [target, ev, src, bound])
  next.set(key, [FX_EVT, null, key])
  prev.delete(key)
}

export function createHead(options: CreateClientHeadOptions = {}): ClientHead {
  const doc = options.document || (typeof document !== 'undefined' ? document : undefined)
  const schedule = options.scheduler || ((flush: () => void) => queueMicrotask(flush))
  const core = createCore({ ssr: false, compile: compileEntry })
  const head = core as ClientHead
  head._doc = doc as Document
  head._dom = null
  head.dirty = false
  head.use(TitlePlugin)

  let scheduled = false
  const flush = () => {
    scheduled = false
    if (head.dirty)
      renderDOM(head)
  }
  const invalidate = () => {
    head.dirty = true
    if (!scheduled) {
      scheduled = true
      schedule(flush)
    }
  }

  const corePush = core.push
  head.push = (input: unknown, opts?: EntryOptions) => {
    const entry = corePush(input, opts)
    invalidate()
    return {
      patch(next: unknown, fills?: unknown[]) {
        entry.patch(next, fills)
        invalidate()
      },
      dispose() {
        entry.dispose()
        invalidate()
      },
    }
  }
  head.render = () => {
    scheduled = false
    return head.dirty ? renderDOM(head) : false
  }
  if (!options.disableDefaults && doc)
    head.dirty = false // defaults come from SSR markup; client adds nothing until first mutation
  return head
}

export function useHead(head: V4Head, input: unknown, opts?: EntryOptions) {
  return head.push(input, opts)
}
