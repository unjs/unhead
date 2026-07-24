import type { DomBeforeRenderCtx, DomRenderTagContext, DomState, HeadRenderer, HeadTag, RenderDomHeadOptions, Unhead } from '../types'
import { HasElementTags } from '../utils/const'
import { dedupeKey, hashTag, isMetaArrayDupeKey, MetaKeyAttrs } from '../utils/dedupe'
import { callHook } from '../utils/hooks'
import { normalizeProps } from '../utils/normalize'
import { resolveTags } from '../utils/resolve'

const WHITESPACE_RE = /\s+/

type DomEventHandler = (this: Element, e: Event) => any

// [target, type, source, boundHandler, cleanup] — tuple over object to keep the renderer small
type DomEventSideEffect = [EventTarget, string, DomEventHandler, EventListener, () => void]

type DomStateInternal = DomState & {
  _d: Document
  _l: Map<string, DomEventSideEffect>
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

function cleanupDomState(state: DomStateInternal) {
  for (const k in state._s) state._s[k]()
  for (const k in state._p) state._p[k]()
  state._s = {}
  state._p = {}
  state._e.clear()
  state._l.clear()
}

function createDomState<T extends Unhead<any>>(head: T, dom: Document): DomStateInternal {
  const state: DomStateInternal = { _d: dom, _t: dom.title, _e: new Map([['htmlAttrs', dom.documentElement], ['bodyAttrs', dom.body]]), _p: {}, _s: {}, _l: new Map() }
  for (const el of [...dom.body.children, ...dom.head.children]) {
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
  }
  for (const entry of head.entries.values()) {
    if (entry._o !== undefined) {
      const orig = entry._o as Record<string, any>
      for (const t of ['bodyAttrs', 'htmlAttrs'] as const) {
        const cls = orig[t]?.class
        if (typeof cls === 'string') {
          const $el = state._e.get(t)!
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
  const documentChanged = !!activeState && activeState._d !== dom
  if (!dom || (activeState && !documentChanged && !head.dirty && !hasPendingEntries(head)))
    return false
  if (head._du)
    return false
  const defaultView = dom.defaultView
  head._du = true
  let didRender = false
  try {
    const beforeRenderCtx: DomBeforeRenderCtx = { shouldRender: true, tags: [] }
    callHook(head, 'dom:beforeRender', beforeRenderCtx)
    if (!beforeRenderCtx.shouldRender)
      return false
    let state = head._dom as DomStateInternal | undefined
    if (state?._d !== dom) {
      if (state)
        cleanupDomState(state)
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

    function track(id: string, scope: string, fn: () => void, fresh?: boolean) {
      const k = `${id}:${scope}`
      // reuse the previous render's cleanup for a stable key: same $el/attr/class means an identical
      // closure, so this avoids reallocating ~one closure per tracked prop every frame. `fresh` opts
      // out for content closures, which capture a value that can change between renders.
      renderState._s[k] = (!fresh && renderState._p[k]) || fn
      delete renderState._p[k]
    }

    // Reclaim the previous render's cleanup for a key (and remove it from the pool), or undefined.
    // Used as `_s[key] = reclaim(key) || (() => ...)` so the cleanup closure sits on the right of
    // `||` and is only allocated when the key is new — a stable re-render allocates no closures.
    function reclaim(key: string): (() => void) | undefined {
      const prev = renderState._p[key]
      delete renderState._p[key]
      return prev
    }

    function trackEvent(id: string, k: string, ev: string, source: DomEventHandler, $el: Element, target: EventTarget) {
      const scope = `event:${k}`
      const key = `${id}:${scope}`
      const prev = renderState._l.get(key)
      // same target/type/source: keep the existing listener, just re-track its cleanup
      if (prev && prev[0] === target && prev[1] === ev && prev[2] === source) {
        track(id, scope, prev[4])
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
      track(id, scope, cleanup, true)
    }

    function trackCtx({ id, $el, tag }: DomRenderTagContext & { $el: Element }) {
      const isAttr = tag.tag.endsWith('Attrs')
      renderState._e.set(id, $el)
      if (tag.tag === 'meta') {
        for (const k of MetaKeyAttrs) {
          if ($el.hasAttribute(k)) {
            const ck = `${id}:attr:${k}`
            renderState._p[ck] ||= () => $el.removeAttribute(k)
          }
        }
      }
      if (!isAttr) {
        // Content is tracked so a reused element (same dedupe id) that later drops its
        // textContent/innerHTML has the stale value cleared. The value guard ensures we only
        // clear what we set, never SSR-adopted or externally mutated content.
        const text = tag.textContent
        if (text != null && text !== '') {
          if (text !== $el.textContent)
            $el.textContent = text as string
          track(id, 'text', () => {
            if ($el.textContent === text)
              $el.textContent = ''
          }, true)
        }
        const html = tag.innerHTML
        if (html != null && html !== '') {
          if (html !== $el.innerHTML)
            $el.innerHTML = html as string
          track(id, 'html', () => {
            if ($el.innerHTML === html)
              $el.innerHTML = ''
          }, true)
        }
        const elKey = `${id}:el`
        renderState._s[elKey] = reclaim(elKey) || (() => {
          $el?.remove()
          renderState._e.delete(id)
        })
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
          for (const c of v as Iterable<string>) {
            const key = `${ck}:${c}`
            renderState._s[key] = reclaim(key) || (() => $el.classList.remove(c))
            if (!$el.classList.contains(c))
              $el.classList.add(c)
          }
        }
        else if (k === 'style' && v) {
          for (const [sk, sv] of v as Iterable<[string, string]>) {
            const key = `${ck}:${sk}`
            renderState._s[key] = reclaim(key) || (() => ($el as HTMLElement).style.removeProperty(sk))
            ;($el as HTMLElement).style.setProperty(sk, sv)
          }
        }
        else if (v !== false as any && v !== null) {
          if ($el.getAttribute(k) !== v as any)
            $el.setAttribute(k, v === true as any ? '' : String(v))
          renderState._s[ck] = reclaim(ck) || (() => $el.removeAttribute(k))
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
        track('title', '', () => dom.title = renderState._t)
        continue
      }
      ctx.$el = renderState._e.get(id)
      if (ctx.$el)
        trackCtx(ctx as DomRenderTagContext & { $el: Element })
      else if (HasElementTags.has(tag.tag))
        pending.push(ctx)
    }
    for (const ctx of pending) {
      ctx.$el = dom.createElement(ctx.tag.tag)
      trackCtx(ctx as DomRenderTagContext & { $el: Element })
      ;(frag[ctx.tag.tagPosition || 'head'] ??= dom.createDocumentFragment()).appendChild(ctx.$el)
    }
    if (frag.head)
      dom.head.appendChild(frag.head)
    if (frag.bodyOpen)
      dom.body.insertBefore(frag.bodyOpen, dom.body.firstChild)
    if (frag.bodyClose)
      dom.body.appendChild(frag.bodyClose)
    for (const k in renderState._p)
      renderState._p[k]()
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
