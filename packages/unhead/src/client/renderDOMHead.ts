import type { DomBeforeRenderCtx, DomRenderTagContext, DomState, HeadRenderer, HeadTag, RenderDomHeadOptions, Unhead } from '../types'
import { callHook } from '../utils/callHook'
import { HasElementTags } from '../utils/const'
import { dedupeKey, hashTag, isMetaArrayDupeKey } from '../utils/dedupe'
import { CLASS_SEPARATOR_RE, normalizeProps } from '../utils/normalize'
import { resolveTags } from '../utils/resolve'

// Source-based tests and the lazy build use the full renderer.
declare const __UNHEAD_LAZY_RENDERER__: boolean

type DomEventHandler = (this: Element, e: Event) => any

// [target, source, cleanup]: a tuple over an object keeps the renderer small.
// The event type needs no slot: the key holds the prop name it comes from.
type DomEventSideEffect = [EventTarget, DomEventHandler, () => void]

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

function clearEffects(effects: DomState['_s']) {
  for (const key in effects) {
    effects[key]()
    delete effects[key]
  }
}

function createDomState<T extends Unhead<any>>(head: T, dom: Document): DomStateInternal {
  const state: DomStateInternal = { _d: dom, _t: dom.title, _e: new Map([['htmlAttrs', dom.documentElement], ['bodyAttrs', dom.body]]), _p: {}, _s: {}, _l: new Map() }
  // keep entry._o intact: it is the SSR cleanup baseline and must be replayable
  // when the same head is rendered into another pre-rendered document.
  for (const entry of head.entries.values()) {
    for (const t of ['bodyAttrs', 'htmlAttrs'] as const) {
      // the pushed input can be null, as a computed input can resolve to
      const cls = (entry._o as Record<string, any> | null | undefined)?.[t]?.class
      if (typeof cls === 'string') {
        const $el = state._e.get(t)!
        for (const c of cls.split(CLASS_SEPARATOR_RE)) {
          if (c)
            state._p[`${t}:attr:class:${c}`] = () => $el.classList.remove(c)
        }
      }
    }
  }
  return state
}

function _renderDOMHead<T extends Unhead<any>>(head: T, options: RenderDomHeadOptions = {}, adopt?: boolean): boolean {
  const adoption = (typeof __UNHEAD_LAZY_RENDERER__ === 'undefined' || __UNHEAD_LAZY_RENDERER__) && adopt
  const dom: Document | undefined = options.document || head.resolvedOptions.document
  const activeState = head._dom as DomStateInternal | undefined
  if (!dom || head._du || (activeState && activeState._d === dom && !head.dirty && !hasPendingEntries(head)))
    return false
  const defaultView = dom.defaultView
  head._du = true
  try {
    const beforeRenderCtx: DomBeforeRenderCtx = { shouldRender: true, tags: [] }
    callHook(head, 'dom:beforeRender', beforeRenderCtx)
    if (!beforeRenderCtx.shouldRender)
      return false
    let state = activeState
    if (state && state._d !== dom) {
      clearEffects(state._s)
      clearEffects(state._p)
      state._e.clear()
      state._l.clear()
      state = undefined
    }
    if (state) {
      // Adoption adds SSR cleanups to the active effects. A live render retires unused ones.
      state._p = adoption ? {} : state._s
      if (!adoption)
        state._s = {}
    }
    const renderState = state || createDomState(head, dom)
    const previous = renderState._p

    function track(key: string, fn: () => void, reuse?: boolean) {
      if (adoption && state && renderState._s[key])
        return
      renderState._s[key] = (reuse && previous[key]) || fn
      delete previous[key]
    }

    function trackEvent(id: string, k: string, ev: string, source: DomEventHandler, $el: Element, target: EventTarget) {
      const key = `${id}:event:${k}`
      const prev = renderState._l.get(key)
      // same target/source: keep the existing listener, just re-track its cleanup
      if (prev && prev[0] === target && prev[1] === source) {
        track(key, prev[2], true)
        return
      }
      prev?.[2]()
      const dk = `data-${k}`
      const handler = ((e: Event) => source.call($el, e)) as EventListener
      const cleanup = () => {
        target.removeEventListener(ev, handler)
        if ($el.getAttribute(dk) === '')
          $el.removeAttribute(dk)
        if (renderState._l.get(key)?.[2] === cleanup)
          renderState._l.delete(key)
      }
      target.addEventListener(ev, handler)
      renderState._l.set(key, [target, source, cleanup])
      $el.setAttribute(dk, '')
      track(key, cleanup)
    }

    function trackContent(id: string, $el: Element, prop: 'textContent' | 'innerHTML', suffix: string, value: unknown) {
      if (value != null && value !== '') {
        if (!adoption && value !== $el[prop])
          $el[prop] = value as string
        track(`${id}:${suffix}`, () => {
          if ($el[prop] === value)
            $el[prop] = ''
        })
      }
    }

    function trackCtx({ id, $el, tag }: DomRenderTagContext & { $el: Element }) {
      renderState._e.set(id, $el)
      if (!tag.tag.endsWith('Attrs')) {
        // Content is tracked so a reused element (same dedupe id) that later drops its
        // textContent/innerHTML has the stale value cleared. The value guard ensures we only
        // clear what we set, never SSR-adopted or externally mutated content.
        trackContent(id, $el, 'textContent', 'text', tag.textContent)
        trackContent(id, $el, 'innerHTML', 'html', tag.innerHTML)
        track(`${id}:el`, () => {
          $el.remove()
          renderState._e.delete(id)
        }, true)
      }
      for (const k in tag.props) {
        const v = tag.props[k]
        if (k.startsWith('on') && typeof v === 'function') {
          if (adoption)
            continue
          const ev = k.slice(2)
          if (($el as HTMLScriptElement).dataset?.[`${k}fired`])
            (v as (e: Event) => any).call($el, new (defaultView?.Event || Event)(ev))
          trackEvent(id, k, ev, v as DomEventHandler, $el, tag.tag === 'bodyAttrs' && defaultView ? defaultView : $el)
          continue
        }
        const ck = `${id}:attr:${k}`
        if (k === 'class' && v) {
          for (const c of v as Iterable<string>) {
            track(`${ck}:${c}`, () => $el.classList.remove(c), true)
            if (!adoption && !$el.classList.contains(c))
              $el.classList.add(c)
          }
        }
        else if (k === 'style' && v) {
          for (const [sk, sv] of v as Iterable<[string, string]>) {
            track(`${ck}:${sk}`, () => ($el as HTMLElement).style.removeProperty(sk), true)
            if (!adoption)
              ($el as HTMLElement).style.setProperty(sk, sv)
          }
        }
        else if (v !== false as any && v !== null) {
          if (!adoption) {
            const value = v === true as any ? '' : String(v)
            if ($el.getAttribute(k) !== value)
              $el.setAttribute(k, value)
          }
          track(ck, () => $el.removeAttribute(k), true)
        }
      }
    }

    const pending: DomRenderTagContext[] = []
    const frag: Partial<Record<string, DocumentFragment>> = {}
    head.dirty = false
    const rawTags = resolveTags(head, options, adoption)
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
        if (!adoption)
          dom.title = tag.textContent as string
        track('title:', () => dom.title = renderState._t, true)
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
      const needsContentKey = pending.some(({ id }) => id?.includes(':content:'))
      const tracked = new Set<Element>()
      // managed elements are released through their own `:el` cleanup
      for (const [key, $el] of renderState._e) {
        const trackedKey = `${key}:el`
        if (renderState._s[trackedKey] === undefined && previous[trackedKey] === undefined && !$el.isConnected)
          renderState._e.delete(key)
        else
          tracked.add($el)
      }
      for (const el of [...dom.body.children, ...dom.head.children]) {
        if (tracked.has(el))
          continue
        const tagName = el.tagName
        const elTag = tagName.toLowerCase() as HeadTag['tag']
        if (!HasElementTags.has(elTag))
          continue
        const props: Record<string, any> = {}
        for (const n of el.getAttributeNames())
          props[n] = el.getAttribute(n)
        const linkHasIdentity = tagName === 'LINK' && el.localName === 'link'
          && props.rel && props.href && props.hreflang !== '' && props.charset !== '' && props.id !== ''
        const next = { tag: elTag, props: linkHasIdentity ? props : {} } as HeadTag
        if (!linkHasIdentity)
          normalizeProps(next, props)
        next.key = props['data-hid'] || undefined
        let dedupe = dedupeKey(next)
        if (!dedupe) {
          if (props.innerHTML === undefined)
            next.innerHTML = el.innerHTML
          dedupe = dedupeKey(next)
          // Only a content-based identity can appear after reading innerHTML.
          if (dedupe && !needsContentKey)
            continue
          dedupe ||= hashTag(next)
        }
        let k = dedupe
        let c = 1
        while (renderState._e.has(k))
          k = `${dedupe}:${c++}`
        renderState._e.set(k, el)
      }
    }
    for (const ctx of pending) {
      const found = renderState._e.get(ctx.id)
      if (adoption && !found)
        continue
      ctx.$el = found || dom.createElement(ctx.tag.tag)
      trackCtx(ctx as DomRenderTagContext & { $el: Element })
      if (!found)
        (frag[ctx.tag.tagPosition || 'head'] ??= dom.createDocumentFragment()).appendChild(ctx.$el)
    }
    if (frag.head)
      dom.head.appendChild(frag.head)
    if (frag.bodyOpen)
      dom.body.insertBefore(frag.bodyOpen, dom.body.firstChild)
    if (frag.bodyClose)
      dom.body.appendChild(frag.bodyClose)
    clearEffects(previous)
    head._dom = renderState
    if (!adoption)
      callHook(head, 'dom:rendered', { renders: tags })
  }
  catch (e) {
    head.dirty = true
    throw e
  }
  finally {
    head._du = false
  }
  if (!adoption && (head.dirty || hasPendingEntries(head)))
    _renderDOMHead(head, options)
  return true
}

// Internal: the lazy runtime renders through this. An adoption render records the cleanups
// of server elements without replaying historical DOM writes.
export { _renderDOMHead as renderLazyDOMHead }
