import type { DomBeforeRenderCtx, DomRenderTagContext, DomState, HeadRenderer, HeadTag, RenderDomHeadOptions, Unhead } from '../types'
import { HasElementTags } from '../utils/const'
import { dedupeKey, hashTag, isMetaArrayDupeKey } from '../utils/dedupe'
import { callHook } from '../utils/hooks'
import { normalizeProps } from '../utils/normalize'
import { resolveTags } from '../utils/resolve'

const WHITESPACE_RE = /\s+/

type DomEventHandler = (this: Element, e: Event) => any

// [target, type, source, boundHandler, cleanup] — tuple over object to keep the renderer small
type DomEventSideEffect = [EventTarget, string, DomEventHandler, EventListener, () => void]

type DomStateInternal = DomState & {
  _a: WeakSet<Element>
  _d: Document
  _l: Map<string, DomEventSideEffect>
  // orphaned longhand keys a retired shorthand left behind, keyed by the claim that
  // retired it; fired only by that claim's cleanup on drop, never by the end-of-pass pool
  _x: Record<string, string[]>
}

/* @__NO_SIDE_EFFECTS__ */
export function createDomRenderer(options: RenderDomHeadOptions = {}): HeadRenderer<boolean> {
  return (head: Unhead<any>) => _renderDOMHead(head, options)
}

/** @deprecated Use `head.render()` instead */
export function renderDOMHead<T extends Unhead<any>>(head: T, options: RenderDomHeadOptions = {}): boolean {
  return _renderDOMHead(head, options)
}

function hasPendingEntries<T extends Unhead<any>>(head: T) {
  for (const entry of head.entries.values()) {
    if (entry._pending !== undefined)
      return true
  }
  return false
}

function createDomState<T extends Unhead<any>>(head: T, dom: Document): DomStateInternal {
  const state: DomStateInternal = { _a: new WeakSet(), _d: dom, _t: dom.title, _e: new Map([['htmlAttrs', dom.documentElement], ['bodyAttrs', dom.body]]), _p: {}, _s: {}, _l: new Map(), _x: {} }
  if (dom.documentElement)
    state._a.add(dom.documentElement)
  if (dom.body)
    state._a.add(dom.body)
  for (const el of [...(dom.body?.children || []), ...dom.head.children]) {
    const tag = el.tagName.toLowerCase() as HeadTag['tag']
    if (!HasElementTags.has(tag))
      continue
    const props: Record<string, any> = { innerHTML: el.innerHTML }
    for (const n of el.getAttributeNames())
      props[n] = el.getAttribute(n)
    const next = normalizeProps({ tag, props: {} } as HeadTag, props)
    next.key = el.getAttribute('data-hid') || undefined
    const dedupe = dedupeKey(next) || hashTag(next)
    let k = dedupe
    let c = 1
    while (state._e.has(k))
      k = `${dedupe}:${c++}`
    state._e.set(k, el)
    state._a.add(el)
  }
  for (const entry of head.entries.values()) {
    if (entry._o !== undefined) {
      const orig = entry._o as Record<string, any>
      for (const t of ['bodyAttrs', 'htmlAttrs'] as const) {
        const cls = orig[t]?.class
        if (typeof cls === 'string') {
          const $el = state._e.get(t)
          if (!$el)
            continue
          for (const c of cls.split(WHITESPACE_RE)) {
            if (c)
              state._p[`${t}:attr:class:${c}`] = () => $el.classList.remove(c)
          }
        }
      }
      // keep entry._o intact: it is the SSR cleanup baseline and must be replayable
      // when the same head is rendered into another pre-rendered document.
    }
  }
  return state
}

function _renderDOMHead<T extends Unhead<any>>(head: T, options: RenderDomHeadOptions = {}): boolean {
  const dom: Document | undefined = options.document || head.resolvedOptions.document
  const activeState = head._dom as DomStateInternal | undefined
  if (!dom || head._du || (activeState && activeState._d === dom && !head.dirty && !hasPendingEntries(head)))
    return false
  const defaultView = dom.defaultView
  head._du = true
  let didRender = false
  try {
    const beforeRenderCtx: DomBeforeRenderCtx = { shouldRender: true, tags: [] }
    callHook(head, 'dom:beforeRender', beforeRenderCtx)
    if (!beforeRenderCtx.shouldRender)
      return false
    let state = activeState
    if (state?._d !== dom) {
      if (state) {
        for (const k in state._s) state._s[k]()
        for (const k in state._p) state._p[k]()
        state._s = state._p = state._x = {}
        state._e.clear()
        state._l.clear()
      }
      state = undefined
    }
    if (!state) {
      state = createDomState(head, dom)
    }
    else {
      // hand the previous render's side effects to _p (cleanup pool) by reference; track()
      // reclaims the ones that are still live and the rest are disposed after this pass
      state._p = state._s
    }
    state._s = {}
    const renderState = state
    const previous = renderState._p
    // detached probe mirroring the CSSOM expansion of claimed style keys
    let expansion: CSSStyleDeclaration | undefined
    const expandStyle = () => expansion ??= dom.createElement('div').style

    // a dropped style claim must also clear longhands orphaned by a shorthand it retired
    // (see retirement below); the record is read at fire time so re-renders keep the
    // claim alive without arming the orphans into the end-of-pass pool
    function styleClaimCleanup(key: string, sk: string, style: CSSStyleDeclaration) {
      return () => {
        style.removeProperty(sk)
        const extras = renderState._x[key]
        if (!extras)
          return
        delete renderState._x[key]
        for (const xk of extras) style.removeProperty(xk)
      }
    }

    function track(key: string, fn: () => void, fresh?: boolean) {
      // reuse the previous render's cleanup for a stable key: same $el/attr/class means an identical
      // closure, so this avoids reallocating ~one closure per tracked prop every frame. `fresh` opts
      // out for content closures, which capture a value that can change between renders.
      renderState._s[key] = (!fresh && previous[key]) || fn
      delete previous[key]
    }

    function seedAttrCleanups(id: string, $el: Element, tag: HeadTag['tag']) {
      // html/body Attrs tags only clean up the entry SSR baseline (_o): classes, attrs, and
      // style keys the entries actually wrote. Anything else on the element was added
      // externally before hydration (theme classes, template attrs) and must survive.
      // Matched element tags keep full reconciliation.
      const scoped = tag.endsWith('Attrs')
      const baseline: Record<string, any> = {}
      const styleKeys = new Set<string>()
      if (scoped) {
        for (const entry of head.entries.values()) {
          const orig = (entry._o as Record<string, any> | undefined)?.[tag]
          if (orig && typeof orig === 'object')
            Object.assign(baseline, orig)
        }
        const kebab = (k: string) => k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
        const addDecl = (v: string) => {
          const i = v.indexOf(':')
          if (i > 0)
            styleKeys.add(kebab(v.slice(0, i).trim()))
        }
        const baseStyle = baseline.style
        if (typeof baseStyle === 'string')
          baseStyle.split(';').forEach(addDecl)
        else if (Array.isArray(baseStyle))
          baseStyle.forEach(v => typeof v === 'string' && addDecl(v))
        else if (baseStyle && typeof baseStyle === 'object')
          Object.keys(baseStyle).forEach(k => styleKeys.add(kebab(k)))
      }
      for (const k of $el.getAttributeNames()) {
        const ck = `${id}:attr:${k}`
        if (k === 'class') {
          if (scoped)
            continue
          renderState._p[ck] ||= () => $el.removeAttribute(k)
          for (const c of $el.classList) {
            renderState._p[`${ck}:${c}`] ||= () => $el.classList.remove(c)
          }
        }
        else if (k === 'style') {
          const style = ($el as HTMLElement).style
          for (let i = 0; i < style.length; i++) {
            const sk = style.item(i)
            if (scoped && !styleKeys.has(sk))
              continue
            renderState._p[`${ck}:${sk}`] ||= () => style.removeProperty(sk)
          }
          if (!scoped)
            renderState._p[ck] ||= () => $el.removeAttribute(k)
        }
        else {
          if (scoped && !(k in baseline))
            continue
          renderState._p[ck] ||= () => $el.removeAttribute(k)
        }
      }
    }

    function trackEvent(id: string, k: string, ev: string, source: DomEventHandler, $el: Element, target: EventTarget) {
      const key = `${id}:event:${k}`
      const prev = renderState._l.get(key)
      // same target/type/source: keep the existing listener, just re-track its cleanup
      if (prev && prev[0] === target && prev[1] === ev && prev[2] === source) {
        track(key, prev[4])
        return
      }
      prev?.[4]()
      const dk = `data-${k}`
      const handler = ((e: Event) => source.call($el, e)) as EventListener
      const cleanup = () => {
        target.removeEventListener(ev, handler)
        if ($el.getAttribute(dk) === '')
          $el.removeAttribute(dk)
        if (renderState._l.get(key)?.[3] === handler)
          renderState._l.delete(key)
      }
      target.addEventListener(ev, handler)
      renderState._l.set(key, [target, ev, source, handler, cleanup])
      $el.setAttribute(dk, '')
      // fresh: this cleanup removes a brand-new listener, the stale _p entry points at the old one
      track(key, cleanup, true)
    }

    function trackCtx({ id, $el, tag }: DomRenderTagContext & { $el: Element }) {
      renderState._e.set(id, $el)
      const adopted = renderState._a.delete($el)
      if (adopted)
        seedAttrCleanups(id, $el, tag.tag)
      if (!tag.tag.endsWith('Attrs')) {
        // Content is tracked so a reused element (same dedupe id) that later drops its
        // textContent/innerHTML has the stale value cleared. The value guard ensures we only
        // clear what we set, never SSR-adopted or externally mutated content.
        const text = tag.textContent
        if (text != null && text !== '') {
          if (text !== $el.textContent)
            $el.textContent = text as string
          track(`${id}:text`, () => {
            if ($el.textContent === text)
              $el.textContent = ''
          }, true)
        }
        const html = tag.innerHTML
        if (html != null && html !== '') {
          if (html !== $el.innerHTML)
            $el.innerHTML = html as string
          track(`${id}:html`, () => {
            if ($el.innerHTML === html)
              $el.innerHTML = ''
          }, true)
        }
        if (adopted && (text == null || text === '') && (html == null || html === '') && $el.textContent)
          renderState._p[`${id}:text`] ||= () => { $el.textContent = '' }
        const elKey = `${id}:el`
        track(elKey, previous[elKey] || (() => {
          $el?.remove()
          renderState._e.delete(id)
        }))
      }
      for (const k in tag.props) {
        const v = tag.props[k]
        if (k[0] === 'o' && k[1] === 'n' && typeof v === 'function') {
          const ev = k.slice(2)
          if (($el as HTMLScriptElement)?.dataset?.[`${k}fired`])
            (v as (e: Event) => any).call($el, new (defaultView?.Event || Event)(ev))
          trackEvent(id, k, ev, v as DomEventHandler, $el, tag.tag === 'bodyAttrs' && defaultView ? defaultView : $el)
          continue
        }
        const ck = `${id}:attr:${k}`
        if (k === 'class' && v) {
          delete renderState._p[ck]
          for (const c of v as Iterable<string>) {
            const key = `${ck}:${c}`
            track(key, previous[key] || (() => $el.classList.remove(c)))
            if (!$el.classList.contains(c))
              $el.classList.add(c)
          }
        }
        else if (k === 'style' && v) {
          delete renderState._p[ck]
          const style = ($el as HTMLElement).style
          const prefix = `${ck}:`
          for (const [sk, sv] of v as Iterable<[string, string]>) {
            const key = `${ck}:${sk}`
            track(key, previous[key] || styleClaimCleanup(key, sk, style))
            // the claim owns this key outright: no orphan record may remove it when
            // another claim on this element drops
            for (const rk of Object.keys(renderState._x)) {
              if (!rk.startsWith(prefix))
                continue
              const owned = renderState._x[rk]!
              const i = owned.indexOf(sk)
              if (i === -1)
                continue
              owned.splice(i, 1)
              if (!owned.length)
                delete renderState._x[rk]
            }
            style.setProperty(sk, sv)
            // Browsers enumerate longhands only, so shorthand claims and cleanups left by the
            // last pass must be reconciled through the CSSOM expansion in both directions or
            // the end-of-pass pool deletes what was just set:
            // - forward: a shorthand claim (`margin`) retires the longhand cleanups it covers
            // - reverse: a previous shorthand covering this claim retires the claimed key too
            const probe = expandStyle()
            // reset between claims: leftovers from an earlier claim must not retire
            // cleanups owned by that claim
            while (probe.length)
              probe.removeProperty(probe.item(0))
            probe.setProperty(sk, sv)
            for (let i = 0; i < probe.length; i++) {
              const xk = probe.item(i)
              if (xk !== sk) {
                delete previous[`${ck}:${xk}`]
                delete renderState._x[`${ck}:${xk}`]
              }
            }
            for (const pk of Object.keys(previous)) {
              if (!pk.startsWith(prefix))
                continue
              const pKey = pk.slice(prefix.length)
              while (probe.length)
                probe.removeProperty(probe.item(0))
              probe.setProperty(pKey, sv)
              let covers = false
              for (let i = 0; i < probe.length; i++) {
                if (probe.item(i) === sk) {
                  covers = true
                  break
                }
              }
              if (!covers)
                continue
              delete previous[pk]
              delete renderState._x[pk]
              // the retired cleanup removed more than the claimed key; keep owning the rest
              // of its expansion so a later drop cannot leak the stale values. The orphans
              // hang off THIS claim and fire with its cleanup on drop, so unrelated or
              // identical re-renders keep the preserved values intact.
              const owned = renderState._x[key] || (renderState._x[key] = [])
              for (let i = 0; i < probe.length; i++) {
                const xk = probe.item(i)
                if (xk !== sk && xk !== pKey && !owned.includes(xk))
                  owned.push(xk)
              }
              renderState._s[key] = styleClaimCleanup(key, sk, style)
            }
          }
        }
        else if (v !== false as any && v !== null) {
          if ($el.getAttribute(k) !== v as any)
            $el.setAttribute(k, v === true as any ? '' : String(v))
          track(ck, previous[ck] || (() => $el.removeAttribute(k)))
        }
      }
    }

    const pending: DomRenderTagContext[] = []
    const frag: Partial<Record<string, DocumentFragment>> = {}
    head.dirty = false
    const rawTags = resolveTags(head, options.tagWeight ? { tagWeight: options.tagWeight } : undefined)
    const tags: DomRenderTagContext[] = []
    const dupeKeyCounter: Record<string, number> = {}
    for (const tag of rawTags) {
      const count = dupeKeyCounter[tag._d!] || 0
      const id = (count ? `${tag._d}:${count}` : tag._d) || tag._h!
      const ctx = { tag, id, shouldRender: true } as DomRenderTagContext
      // meta guard matches dedupeTags: link keys like `link:author:x` must not hit the counter
      if (tag.tag === 'meta' && tag._d && isMetaArrayDupeKey(tag._d))
        dupeKeyCounter[tag._d] = count + 1
      tags.push(ctx)
      if (tag.tag === 'title') {
        dom.title = tag.textContent as string
        track('title:', () => dom.title = renderState._t)
        continue
      }
      ctx.$el = renderState._e.get(id)
      if (ctx.$el)
        trackCtx(ctx as DomRenderTagContext & { $el: Element })
      else if (HasElementTags.has(tag.tag))
        pending.push(ctx)
    }
    // Scan when a missing tag may match late server HTML.
    if (pending.length) {
      const tracked = new Set(renderState._e.values())
      for (const el of [...(dom.body?.children || []), ...dom.head.children]) {
        const elTag = el.tagName.toLowerCase() as HeadTag['tag']
        if (!HasElementTags.has(elTag) || tracked.has(el))
          continue
        const props: Record<string, any> = { innerHTML: el.innerHTML }
        for (const n of el.getAttributeNames())
          props[n] = el.getAttribute(n)
        const next = normalizeProps({ tag: elTag, props: {} } as HeadTag, props)
        next.key = el.getAttribute('data-hid') || undefined
        const dedupe = dedupeKey(next) || hashTag(next)
        let k = dedupe
        let c = 1
        while (renderState._e.has(k))
          k = `${dedupe}:${c++}`
        renderState._e.set(k, el)
        renderState._a.add(el)
      }
    }
    for (const ctx of pending) {
      const found = renderState._e.get(ctx.id)
      ctx.$el = found || dom.createElement(ctx.tag.tag)
      trackCtx(ctx as DomRenderTagContext & { $el: Element })
      if (!found)
        (frag[ctx.tag.tagPosition || 'head'] ??= dom.createDocumentFragment()).appendChild(ctx.$el)
    }
    if (frag.head)
      dom.head.appendChild(frag.head)
    // body-position tags need a <body>; on a body-less document they are dropped
    if (dom.body) {
      if (frag.bodyOpen)
        dom.body.insertBefore(frag.bodyOpen, dom.body.firstChild)
      if (frag.bodyClose)
        dom.body.appendChild(frag.bodyClose)
    }
    for (const k in previous)
      previous[k]()
    head._dom = renderState
    didRender = true
    callHook(head, 'dom:rendered', { renders: tags })
  }
  catch (e) {
    head.dirty = true
    throw e
  }
  finally {
    head._du = false
  }
  if (didRender && (head.dirty || hasPendingEntries(head)))
    _renderDOMHead(head, options)
  return didRender
}
