/**
 * v4 client: DOM renderer + createHead.
 * Contracts from V4_DESIGN.md 5.1: zero work until first mutation (no init
 * scan; adoption happens lazily inside the first flush), never reorder
 * existing elements (w is an SSR concern), side effects tracked as one flat
 * stride-3 array per render, renders batched on a microtask.
 */
import type { EntryOptions, Tag, V4Head } from './core'
import { compileEntry, identity, TitlePlugin } from './compile'
import {
  createCore,
  F_ID,
  F_POS,
  F_PREBUILT,
  F_RAW,
  F_REMOVED,
  INNER_CONTENT,
  POS_SHIFT,
  T_BODY_ATTRS,
  T_HTML_ATTRS,
  T_TITLE,
  T_TITLE_TEMPLATE,
  TAG_NAMES,
  unescapeHtml,
} from './core'

// side-effect kinds; effects are one flat stride-3 array per render
// (kind, target, data) reclaimed by a lockstep diff against the previous
// render (V4_DESIGN.md 5.1/7: flat measured 2.2x over closures, keyed
// records were speed-neutral). Kinds above FX_EVT carry an undo payload in
// the data slot rather than an identity: a matching (kind, target) pair is
// the same effect even when the payload changed.
const FX_ATTR = 0
const FX_CLASS = 1
const FX_STYLE = 2
const FX_EL = 3
const FX_EVT = 4
const FX_TEXT = 5
const FX_HTML = 6
const FX_TITLE = 7

interface DomState {
  els: Map<string, Element>
  /** flat stride-3 (kind, target, data) effects applied by the last render */
  fx: any[]
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

// lazy adoption: index existing (SSR-rendered) elements by the exact compile
// identity (data-hid stands in for key) so the first flush reuses them instead
// of duplicating; hash covers positionally-unique tags
function adopt(doc: Document, els: Map<string, Element>) {
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
    const key = identity(id, p, c, p['data-hid'] ?? null) || hashTag({ f: id, w: 0, o: 0, d: '', p, c })
    let k = key
    let n = 1
    while (els.has(k)) k = `${key}:${n++}`
    els.set(k, el)
  }
}

// effect i in a equals effect j in b (payload kinds match on target alone)
function sameFx(a: any[], b: any[], i: number, j: number): boolean {
  return a[i] === b[j] && a[i + 1] === b[j + 1] && (a[i] > FX_EVT || a[i + 2] === b[j + 2])
}

// membership key for the seen-set (payload kinds identify by kind alone)
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
      // a replaced script re-keys to a new element; only drop the mapping
      // when it still points at the undone element
      state.els.get(k) === t && state.els.delete(k)
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

// ---- prebuilt (sealed plan) rendering: c is final html, not props ----------

const ATTR_RE = /\s([^\s=>]+)(?:="([^"]*)")?/g
const QUOT_ENT_RE = /&quot;/g
const unescAttr = (s: string) => s.includes('&quot;') ? s.replace(QUOT_ENT_RE, '"') : s

interface Parsed {
  name: string
  attrs: [string, string][]
  content: string | null
}

/** Regex scan of a single prebuilt tag's html; no HTML parser involved. */
function parsePrebuilt(html: string): Parsed {
  const gt = html.indexOf('>')
  const open = html.slice(1, gt)
  const sp = open.indexOf(' ')
  const name = sp < 0 ? open : open.slice(0, sp)
  const attrs: [string, string][] = []
  if (sp >= 0) {
    ATTR_RE.lastIndex = 0
    let m = ATTR_RE.exec(open)
    while (m) {
      attrs.push([m[1], m[2] === undefined ? '' : unescAttr(m[2])])
      m = ATTR_RE.exec(open)
    }
  }
  const close = html.lastIndexOf('</')
  return { name, attrs, content: close > gt ? html.slice(gt + 1, close) : null }
}

function setParsedContent(el: any, pd: Parsed) {
  // script/style content is raw text; noscript's is markup
  const prop = pd.name === 'noscript' ? 'innerHTML' : 'textContent'
  el[prop] !== pd.content && (el[prop] = pd.content)
}

function buildParsed(doc: Document, pd: Parsed): Element {
  const el = doc.createElement(pd.name)
  for (const [k, v] of pd.attrs) el.setAttribute(k, v)
  if (pd.content != null)
    setParsedContent(el, pd)
  return el
}

/** Attr-level sync: write only what differs, drop what disappeared. */
function syncParsed(el: any, pd: Parsed) {
  for (const [k, v] of pd.attrs) el.getAttribute(k) !== v && el.setAttribute(k, v)
  if (el.attributes.length !== pd.attrs.length) {
    for (const a of el.getAttributeNames()) {
      let keep = false
      for (const [k] of pd.attrs) {
        if (k === a) {
          keep = true
          break
        }
      }
      keep || el.removeAttribute(a)
    }
  }
  if (pd.content != null)
    setParsedContent(el, pd)
}

// ---------------------------------------------------------------------------

function renderDOM(head: ClientHead): boolean {
  const doc = head._doc
  if (!doc)
    return false
  head.dirty = false
  let state = head._dom
  if (!state) {
    state = head._dom = { els: new Map(), fx: [], listeners: new Map(), title: doc.title }
    adopt(doc, state.els)
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

    if (f & F_PREBUILT) {
      // sealed plan tuple: c is final html. Head-position tuples carry no
      // type id in f (revivePlan only encodes position), so dispatch on d/c.
      if (id === T_HTML_ATTRS || id === T_BODY_ATTRS) {
        // single-attr fragment string, e.g. ' class="dark"' (wire contract)
        const el: any = id === T_HTML_ATTRS ? doc.documentElement : doc.body
        const c = t.c!
        const eq = c.indexOf('="')
        const k = eq < 0 ? c.slice(1) : c.slice(1, eq)
        const v = eq < 0 ? '' : unescAttr(c.slice(eq + 2, -1))
        if (k === 'class') {
          fx.push(FX_CLASS, el, v)
          el.classList.contains(v) || el.classList.add(v)
        }
        else if (k === 'style') {
          const ci = v.indexOf(':')
          const sk = v.slice(0, ci).trim()
          fx.push(FX_STYLE, el, sk)
          el.style.setProperty(sk, v.slice(ci + 1).trim())
        }
        else {
          fx.push(FX_ATTR, el, k)
          setAttr(el, k, eq < 0 ? true : v)
        }
        continue
      }
      if (t.d === 'title') {
        const c = t.c!
        const text = unescapeHtml(c.slice(7, c.length - 8))
        doc.title !== text && (doc.title = text)
        fx.push(FX_TITLE, 0, state.title)
        continue
      }
      const base = t.d || `pb:${t.c}`
      const nth = dupes[base] || 0
      dupes[base] = nth + 1
      const key = nth ? `${base}:${nth}` : base
      let el: any = state.els.get(key)
      const fresh = !el
      if (fresh) {
        el = buildParsed(doc, parsePrebuilt(t.c!))
        el._uhc = t.c
        state.els.set(key, el)
      }
      else if (el._uhc !== t.c) {
        const pd = parsePrebuilt(t.c!)
        if (el.tagName === 'SCRIPT') {
          // a changed script is a new script; replace, never mutate
          const s: any = buildParsed(doc, pd)
          el.replaceWith(s)
          state.els.set(key, s)
          el = s
        }
        else {
          syncParsed(el, pd)
        }
        el._uhc = t.c
      }
      fx.push(FX_EL, el, key)
      if (fresh) {
        const pos = (f & F_POS) >> POS_SHIFT
        const frag = pos === 0
          ? (headFrag ||= doc.createDocumentFragment())
          : pos === 1 ? (openFrag ||= doc.createDocumentFragment()) : (closeFrag ||= doc.createDocumentFragment())
        frag.appendChild(el)
      }
      continue
    }

    if (id === T_TITLE_TEMPLATE)
      continue

    if (id === T_TITLE) {
      if (doc.title !== t.c)
        doc.title = t.c ?? ''
      fx.push(FX_TITLE, 0, state.title)
      continue
    }

    // per-prop attr tags apply directly to documentElement/body
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

    // element tags: adopt by identity, else create and append in resolve order
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
    // entry tag caches are stable objects: same Tag re-rendered to the same
    // element means every prop was applied last render, so skip the DOM reads
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

  // reclaim: undo whatever last render applied that this one didn't re-apply.
  // steady-state rerenders resolve entirely in the lockstep prefix (no keys,
  // no allocation); a keyed seen-set only materializes for the changed middle.
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
    // effect triples are unique within a render (dedupe collapses identical
    // identities before the renderer), so set membership is exact
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
  const coreInvalidate = core.invalidate
  head.invalidate = () => {
    coreInvalidate()
    invalidate()
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
