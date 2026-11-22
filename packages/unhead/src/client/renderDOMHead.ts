import type { DomBeforeRenderCtx, DomRenderTagContext, DomState, HeadRenderer, HeadTag, RenderDomEvent, RenderDomHeadOptions, Unhead } from '../types'
import { HasElementTags } from '../utils/const'
import { dedupeKey, hashTag, isMetaArrayDupeKey } from '../utils/dedupe'
import { callHook } from '../utils/hooks'
import { normalizeProps } from '../utils/normalize'
import { resolveTags } from '../utils/resolve'
import { domEvents } from './buildFeatures'
import { renderDomEvent } from './domEventHandlers'

const WHITESPACE_RE = /\s+/

type DomStateInternal = DomState & { _d: Document }

/* @__NO_SIDE_EFFECTS__ */
export function createDomRenderer(options: RenderDomHeadOptions = {}): HeadRenderer<boolean> {
  return head => _renderDOMHead(head, options, domEvents ? renderDomEvent : undefined)
}

export function renderStreamingDOMHead(head: Unhead<any>): boolean {
  return _renderDOMHead(head, {})
}

/** @deprecated Use `head.render()` instead */
export function renderDOMHead<T extends Unhead<any>>(head: T, options: RenderDomHeadOptions = {}): boolean {
  return _renderDOMHead(head, options, domEvents ? renderDomEvent : undefined)
}

function hasPendingEntries<T extends Unhead<any>>(head: T) {
  for (const entry of head.entries.values()) {
    if (entry._pending !== undefined)
      return true
  }
  return false
}

function createDomState<T extends Unhead<any>>(head: T, dom: Document): DomStateInternal {
  const state: DomStateInternal = { _d: dom, _t: dom.title, _e: new Map([['htmlAttrs', dom.documentElement], ['bodyAttrs', dom.body]]), _p: {}, _s: {} }
  // keep entry._o intact: it is the SSR cleanup baseline and must be replayable
  // when the same head is rendered into another pre-rendered document.
  for (const entry of head.entries.values()) {
    for (const t of ['bodyAttrs', 'htmlAttrs'] as const) {
      // the pushed input can be null, as a computed input can resolve to
      const cls = (entry._o as Record<string, any> | null | undefined)?.[t]?.class
      if (typeof cls === 'string') {
        const $el = state._e.get(t)!
        for (const c of cls.split(WHITESPACE_RE)) {
          if (c)
            state._p[`${t}:attr:class:${c}`] = () => $el.classList.remove(c)
        }
      }
    }
  }
  return state
}

function _renderDOMHead<T extends Unhead<any>>(head: T, options: RenderDomHeadOptions, defaultRenderEvent?: RenderDomEvent): boolean {
  const dom: Document | undefined = options.document || head.resolvedOptions.document
  const activeState = head._dom as DomStateInternal | undefined
  if (!dom || head._du || (activeState && activeState._d === dom && !head.dirty && !hasPendingEntries(head)))
    return false
  head._du = true
  let didRender = false
  try {
    const beforeRenderCtx: DomBeforeRenderCtx = { shouldRender: true, tags: [] }
    callHook(head, 'dom:beforeRender', beforeRenderCtx)
    if (!beforeRenderCtx.shouldRender)
      return false
    const renderEvent = defaultRenderEvent ?? head._domEvent
    let state = activeState
    if (state?._d !== dom) {
      if (state) {
        for (const k in state._s) state._s[k]()
        for (const k in state._p) state._p[k]()
        state._s = state._p = {}
        state._e.clear()
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

    function track(key: string, fn: () => void, fresh?: boolean) {
      // reuse the previous render's cleanup for a stable key: same $el/attr/class means an identical
      // closure, so this avoids reallocating ~one closure per tracked prop every frame. `fresh` opts
      // out for content closures, which capture a value that can change between renders.
      renderState._s[key] = (!fresh && previous[key]) || fn
      delete previous[key]
    }

    function trackCtx({ id, $el, tag }: DomRenderTagContext & { $el: Element }) {
      renderState._e.set(id, $el)
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
        const elKey = `${id}:el`
        track(elKey, previous[elKey] || (() => {
          $el?.remove()
          renderState._e.delete(id)
        }))
      }
      for (const k in tag.props) {
        const v = tag.props[k]
        if (k[0] === 'o' && k[1] === 'n' && typeof v === 'function') {
          renderEvent?.(renderState, id, tag.tag, $el, k, v, track)
          continue
        }
        const ck = `${id}:attr:${k}`
        if (k === 'class' && v) {
          for (const c of v as Iterable<string>) {
            const key = `${ck}:${c}`
            track(key, previous[key] || (() => $el.classList.remove(c)))
            if (!$el.classList.contains(c))
              $el.classList.add(c)
          }
        }
        else if (k === 'style' && v) {
          for (const [sk, sv] of v as Iterable<[string, string]>) {
            const key = `${ck}:${sk}`
            track(key, previous[key] || (() => ($el as HTMLElement).style.removeProperty(sk)))
            ;($el as HTMLElement).style.setProperty(sk, sv)
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
    const rawTags = resolveTags(head, options)
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
    if (frag.bodyOpen)
      dom.body.insertBefore(frag.bodyOpen, dom.body.firstChild)
    if (frag.bodyClose)
      dom.body.appendChild(frag.bodyClose)
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
    _renderDOMHead(head, options, defaultRenderEvent)
  return didRender
}
