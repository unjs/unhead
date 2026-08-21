/** @experimental v4 preview surface: semver-exempt until v4 stabilizes. See packages/unhead/V4_DESIGN.md. */
/**
 * Strict v4 browser profile: sealed plans in, DOM effects out.
 *
 * DOM wiring here is a deliberate duplicate of client.ts's attachDom/renderDOM,
 * not a reuse: every tag a sealed head resolves carries F_PREBUILT (revivePlan
 * always sets it) and never F_REMOVED (the sealed core has no plugin resolve
 * stage to set tombstones), so client.ts's title/titleTemplate/htmlAttrs/
 * bodyAttrs/generic-element dispatch and its FX_EVT/FX_TEXT/FX_HTML undo cases
 * are unreachable dead weight for this profile. Splitting the renderer lets
 * each bundle pay only for the branches its profile can hit (V4_DESIGN.md
 * "no bundle ever contains both" rationale, same as createSealedCore).
 */
import type { ClientHead, CreateClientHeadOptions, DomState, PrebuiltRender } from './client'
import type { CompiledEntryOptions, CompiledHead, CompiledPlan } from './compiled'
import type { V4Head } from './core'
import { FX_ATTR, FX_CLASS, FX_EL, FX_STYLE, hashTag } from './client'
import { installPlanRenderer } from './client-plans'
import { F_POS, POS_SHIFT, T_BODY_ATTRS, T_HTML_ATTRS, T_STYLE, T_TITLE, TAG_NAMES } from './core'
import { createSealedCore } from './core-sealed'
import { identity } from './identity'

export type { CompiledEntry, CompiledEntryOptions, CompiledHead, CompiledPlan } from './compiled'

export interface CompiledClientHead extends CompiledHead {
  readonly dirty: boolean
  render: () => boolean
}

export type CreateCompiledClientHeadOptions = CreateClientHeadOptions

interface SealedClientHead extends V4Head {
  render: () => boolean
  dirty: boolean
  _doc: Document
  _dom: DomState | null
  _plans: PrebuiltRender
}

// lazy adoption, sealed twin of client.ts's adopt(): same DOM scan, same
// identity/hashTag fallback keying (both sides must key identically so SSR
// markup adopts instead of duplicating)
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
    const c = id >= T_STYLE ? el.innerHTML || null : null
    const key = identity(id, p, c, p['data-hid'] ?? null) || hashTag({ f: id, w: 0, o: 0, d: '', p, c })
    let k = key
    let n = 1
    while (els.has(k)) k = `${key}:${n++}`
    els.set(k, el)
  }
}

// sealed twin of client.ts's sameFx/fxKey: a sealed fx stream never carries
// FX_EVT payload triples, so the payload-kind branch client.ts needs is gone
function sameFx(a: any[], b: any[], i: number, j: number): boolean {
  return a[i] === b[j] && a[i + 1] === b[j + 1]
}

function fxKey(a: any[], i: number): number {
  return a[i]
}

// sealed twin of client.ts's undoFx: a sealed head's fx stream only ever
// carries FX_ATTR/FX_CLASS/FX_STYLE/FX_EL/FX_TITLE (client-plans' renderPrebuilt
// never emits FX_EVT/FX_TEXT/FX_HTML), so those cases are dropped
function undoFx(kind: number, t: any, k: any, state: DomState, doc: Document) {
  switch (kind) {
    case FX_ATTR: t.removeAttribute(k)
      break
    case FX_CLASS: t.classList.remove(k)
      break
    case FX_STYLE: t.style.removeProperty(k)
      break
    case FX_EL: t.remove()
      state.els.get(k) === t && state.els.delete(k)
      break
    default: doc.title = k
  }
}

function renderDOMSealed(head: SealedClientHead): boolean {
  const doc = head._doc
  if (!doc)
    return false
  head.dirty = false
  const tags = head.resolve()
  let state = head._dom
  if (!state) {
    if (!tags.length)
      return true
    state = head._dom = { els: new Map(), fx: [], listeners: new Map(), title: doc.title }
    adopt(doc, state.els)
  }
  const prev = state.fx
  const fx: any[] = []
  state.fx = fx

  const dupes: Record<string, number> = Object.create(null)
  const frags: (DocumentFragment | undefined)[] = []
  const plans = head._plans

  for (let i = 0; i < tags.length; i++) {
    const t = tags[i]
    const el = plans(t, doc, state, fx, dupes)
    el && (frags[(t.f & F_POS) >> POS_SHIFT] ||= doc.createDocumentFragment()).appendChild(el)
  }

  if (frags[0])
    doc.head.appendChild(frags[0])
  if (frags[1])
    doc.body.insertBefore(frags[1], doc.body.firstChild)
  if (frags[2])
    doc.body.appendChild(frags[2])

  // reclaim: identical lockstep-prefix/suffix diff to client.ts's renderDOM
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

// sealed twin of client.ts's attachDom: same scheduler/invalidate/push wiring,
// wired to renderDOMSealed instead. A full duplicate rather than a
// render-function parameter on attachDom itself: this profile's createHead is
// the only caller, and a shared attachDom would make every loose call site
// carry a parameter it never uses.
function attachSealedDom(core: V4Head, options: CreateClientHeadOptions): SealedClientHead {
  const doc = options.document || (typeof document !== 'undefined' ? document : undefined)
  const schedule = options.scheduler || ((flush: () => void) => queueMicrotask(flush))
  const head = core as unknown as SealedClientHead
  head._doc = doc as Document
  head._dom = null
  head.dirty = false

  let scheduled = false
  const flush = () => {
    scheduled = false
    if (head.dirty)
      renderDOMSealed(head)
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
  head.push = (input, opts) => {
    const entry = corePush(input, opts)
    invalidate()
    return {
      patch(next, fills) {
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
    return head.dirty ? renderDOMSealed(head) : false
  }
  return head
}

/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: CreateCompiledClientHeadOptions = {}): CompiledClientHead {
  const head = attachSealedDom(createSealedCore({ ssr: false }), options)
  installPlanRenderer(head as unknown as ClientHead)
  // A plan has no props for plugins to inspect; the sealed core's use() throws
  if ('plugins' in options)
    head.use(0 as never)
  return head as unknown as CompiledClientHead
}

export function useHead(head: CompiledClientHead, plan: CompiledPlan, options?: CompiledEntryOptions) {
  return head.push(plan, options)
}

export function renderDOMHead(head: CompiledClientHead): boolean {
  return head.render()
}
