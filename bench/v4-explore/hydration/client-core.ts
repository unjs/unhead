/**
 * Hydration exploration: parameterized copy of packages/unhead/src/v4/client.ts.
 * The render pipeline is byte-for-byte the same as the real client; the only
 * seam is the adoption step (how SSR-rendered elements get claimed) plus an
 * eager flag (adopt at createHead instead of first flush). Strategies live in
 * ./clients.ts. DO NOT import this outside bench/v4-explore.
 */
import type { EntryOptions, Tag, V4Head } from '../../../packages/unhead/src/v4/core'
import { compileEntry, TitlePlugin } from '../../../packages/unhead/src/v4/compile'
import {
  createCore,
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
} from '../../../packages/unhead/src/v4/core'

const FX_ATTR = 0
const FX_CLASS = 1
const FX_STYLE = 2
const FX_EL = 3
const FX_EVT = 4
const FX_TEXT = 5
const FX_HTML = 6
const FX_TITLE = 7

export interface DomState {
  els: Map<string, Element>
  fx: any[]
  listeners: Map<string, [EventTarget, string, EventListener, EventListener]>
  title: string
}

export interface VariantHead extends V4Head {
  render: () => boolean
  dirty: boolean
  _doc: Document
  _dom: DomState | null
  _adopt: AdoptFn
}

export type AdoptFn = (doc: Document, els: Map<string, Element>) => void

export interface AdoptStrategy {
  adopt: AdoptFn
  /** pay the adoption cost at createHead instead of lazily at first flush */
  eager?: boolean
}

export interface CreateVariantHeadOptions {
  document?: Document
  scheduler?: (flush: () => void) => void
  disableDefaults?: boolean
}

const hashCache = /* @__PURE__ */ new WeakMap<Tag, string>()

// fallback identity for positionally-unique tags (same as real client.ts)
export function hashTag(t: Tag): string {
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

function sameFx(a: any[], b: any[], i: number, j: number): boolean {
  return a[i] === b[j] && a[i + 1] === b[j + 1] && (a[i] > FX_EVT || a[i + 2] === b[j + 2])
}

function fxKey(a: any[], i: number): string | number {
  return a[i] > FX_EVT ? a[i] : `${a[i]}\0${a[i + 2]}`
}

function setAttr(el: Element, k: string, v: any) {
  const sv = v === true ? '' : String(v)
  el.getAttribute(k) !== sv && el.setAttribute(k, sv)
}

function undoFx(kind: number, t: any, k: any, state: DomState, doc: Document) {
  switch (kind) {
    case FX_ATTR: t.removeAttribute(k)
      break
    case FX_CLASS: t.classList.remove(k)
      break
    case FX_STYLE: t.style.removeProperty(k)
      break
    case FX_EL: t.remove()
      state.els.delete(k)
      break
    case FX_EVT: {
      const l = state.listeners.get(k)
      if (l) {
        l[0].removeEventListener(l[1], l[3])
        state.listeners.delete(k)
      }
      break
    }
    case FX_TEXT:
    case FX_HTML: {
      const prop = kind === FX_TEXT ? 'textContent' : 'innerHTML'
      t[prop] === k && (t[prop] = '')
      break
    }
    default: doc.title = k
  }
}

function renderDOM(head: VariantHead): boolean {
  const doc = head._doc
  if (!doc)
    return false
  head.dirty = false
  let state = head._dom
  if (!state) {
    state = head._dom = { els: new Map(), fx: [], listeners: new Map(), title: doc.title }
    head._adopt(doc, state.els)
  }
  const prev = state.fx
  const fx: any[] = []
  state.fx = fx

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
      fx.push(FX_TITLE, 0, state.title)
      continue
    }

    if (id === T_HTML_ATTRS || id === T_BODY_ATTRS) {
      const el: any = id === T_HTML_ATTRS ? doc.documentElement : doc.body
      const p = t.p!
      for (const k in p) {
        const v = p[k]
        if (k === 'class') {
          fx.push(FX_CLASS, el, v)
          el.classList.contains(v) || el.classList.add(v)
        }
        else if (k === 'style') {
          const ci = (v as string).indexOf(':')
          const sk = (v as string).slice(0, ci)
          fx.push(FX_STYLE, el, sk)
          el.style.setProperty(sk, (v as string).slice(ci + 1))
        }
        else if (k[0] === 'o' && k[1] === 'n' && typeof v === 'function') {
          bindEvent(state, fx, TAG_NAMES[id] + k, el, k.slice(2), v, id === T_BODY_ATTRS ? doc.defaultView || el : el)
        }
        else if (v !== false && v !== null) {
          fx.push(FX_ATTR, el, k)
          setAttr(el, k, v)
        }
      }
      continue
    }

    const base = t.d || hashTag(t)
    const nth = dupes[base] || 0
    dupes[base] = nth + 1
    const key = nth ? `${base}:${nth}` : base
    let el: any = state.els.get(key)
    const fresh = !el
    if (fresh) {
      el = doc.createElement(TAG_NAMES[id])
      state.els.set(key, el)
    }
    fx.push(FX_EL, el, key)
    const same = el._uht === t
    el._uht = t

    if (t.p) {
      for (const k in t.p) {
        const v = t.p[k]
        if (k[0] === 'o' && k[1] === 'n' && typeof v === 'function') {
          bindEvent(state, fx, `${key}:${k}`, el, k.slice(2), v, el)
        }
        else if (v === false || v === null) {
          // dropped prop
        }
        else if (k === 'class') {
          for (const c of v as Set<string>) {
            fx.push(FX_CLASS, el, c)
            same || el.classList.contains(c) || el.classList.add(c)
          }
        }
        else if (k === 'style') {
          for (const [sk, sv] of v as Map<string, string>) {
            fx.push(FX_STYLE, el, sk)
            same || el.style.setProperty(sk, sv)
          }
        }
        else {
          fx.push(FX_ATTR, el, k)
          same || setAttr(el, k, v)
        }
      }
    }
    if (t.c != null && (INNER_CONTENT >> id & 1)) {
      const prop = f & F_RAW ? 'innerHTML' : 'textContent'
      same || el[prop] === t.c || (el[prop] = t.c)
      fx.push(f & F_RAW ? FX_HTML : FX_TEXT, el, t.c)
    }
    if (fresh) {
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

  let s = 0
  const pn = prev.length
  const nn = fx.length
  const min = pn < nn ? pn : nn
  while (s < min && sameFx(prev, fx, s, s)) s += 3
  if (s < pn) {
    let pe = pn
    let ne = nn
    while (pe > s && ne > s && sameFx(prev, fx, pe - 3, ne - 3)) {
      pe -= 3
      ne -= 3
    }
    let seen: Map<any, Set<any>> | null = null
    if (ne > s) {
      seen = new Map()
      for (let i = s; i < ne; i += 3) {
        let set = seen.get(fx[i + 1])
        set || seen.set(fx[i + 1], set = new Set())
        set.add(fxKey(fx, i))
      }
    }
    for (let i = pe - 3; i >= s; i -= 3) {
      if (!seen || !seen.get(prev[i + 1])?.has(fxKey(prev, i)))
        undoFx(prev[i], prev[i + 1], prev[i + 2], state, doc)
    }
  }
  return true
}

function bindEvent(state: DomState, fx: any[], key: string, el: Element, ev: string, src: any, target: EventTarget) {
  const ex = state.listeners.get(key)
  if (!ex || ex[2] !== src) {
    ex && ex[0].removeEventListener(ex[1], ex[3])
    const bound = ((e: Event) => src.call(el, e)) as EventListener
    target.addEventListener(ev, bound)
    state.listeners.set(key, [target, ev, src, bound])
  }
  fx.push(FX_EVT, 0, key)
}

export function createVariantHead(options: CreateVariantHeadOptions, strategy: AdoptStrategy): VariantHead {
  const doc = options.document || (typeof document !== 'undefined' ? document : undefined)
  const schedule = options.scheduler || ((flush: () => void) => queueMicrotask(flush))
  const core = createCore({ ssr: false, compile: compileEntry })
  const head = core as VariantHead
  head._doc = doc as Document
  head._dom = null
  head._adopt = strategy.adopt
  head.dirty = false
  head.use(TitlePlugin)

  if (strategy.eager && doc) {
    const state: DomState = { els: new Map(), fx: [], listeners: new Map(), title: doc.title }
    strategy.adopt(doc, state.els)
    head._dom = state
  }

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
  return head
}
