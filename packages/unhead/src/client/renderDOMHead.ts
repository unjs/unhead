import type { DomBeforeRenderCtx, DomRenderTagContext, DomState, HeadRenderer, HeadTag, RenderDomHeadOptions, Unhead } from '../types'
import { HasElementTags } from '../utils/const'
import { dedupeKey, hashTag, isMetaArrayDupeKey } from '../utils/dedupe'
import { callHook } from '../utils/hooks'
import { normalizeProps } from '../utils/normalize'
import { resolveTags } from '../utils/resolve'

const WHITESPACE_RE = /\s+/

type DomEventHandler = (this: Element, e: Event) => any

// [target, source, boundHandler, cleanup]: a tuple over an object keeps the renderer small.
// The event type needs no slot: the key holds the prop name it comes from.
type DomEventSideEffect = [EventTarget, DomEventHandler, EventListener, () => void]
type StyleDeclarations = ReadonlyMap<string, string>
type StyleCleanup = (next?: StyleDeclarations) => void

type DomStateInternal = DomState & {
  _a: WeakSet<Element>
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

function removeStyles(style: CSSStyleDeclaration, keys: Iterable<string>, next?: StyleDeclarations) {
  for (const key of keys) {
    if (!next?.has(key))
      style.removeProperty(key)
  }
}

function isStaticValue(value: unknown) {
  return value === null || (typeof value !== 'object' && typeof value !== 'function')
}

function staticRootProps(input: Record<string, unknown>) {
  const props: Record<string, unknown> = Object.create(null)
  for (const [key, value] of Object.entries(input)) {
    if (isStaticValue(value)) {
      props[key] = value
    }
    else if (key === 'class' || key === 'style') {
      if (Array.isArray(value))
        props[key] = value.filter(item => typeof item === 'string')
      else if (value && typeof value === 'object')
        props[key] = Object.fromEntries(Object.entries(value).filter(([, item]) => isStaticValue(item)))
    }
  }
  return props
}

function createDomState<T extends Unhead<any>>(head: T, dom: Document): DomStateInternal {
  const state: DomStateInternal = { _a: new WeakSet(), _d: dom, _t: dom.title, _e: new Map(), _p: {}, _s: {}, _l: new Map() }
  for (const [tag, el] of [['htmlAttrs', dom.documentElement], ['bodyAttrs', dom.body]] as const) {
    if (!el)
      continue
    state._e.set(tag, el)
    const styleKeys = new Set<string>()
    // A raw entry can contain callbacks or attributes that useHeadSafe rejects.
    for (const entry of head.entries.values()) {
      const original = (entry._o as Record<string, any> | undefined)?.[tag]
      if (!original || typeof original !== 'object')
        continue
      const baseline = entry.options?._safe ? { class: original.class } : original
      const { props } = normalizeProps({ tag, props: {} }, staticRootProps(baseline))
      for (const key in props) {
        const cleanupKey = `${tag}:attr:${key}`
        if (key === 'class') {
          const classes = props[key] as unknown
          if (!(classes instanceof Set))
            continue
          for (const value of classes) {
            for (const name of value.split(WHITESPACE_RE)) {
              if (name)
                state._p[`${cleanupKey}:${name}`] = () => el.classList.remove(name)
            }
          }
        }
        else if (key === 'style') {
          const declarations = props[key] as unknown
          if (declarations instanceof Map) {
            for (const name of declarations.keys())
              styleKeys.add(name)
          }
        }
        else if (el.hasAttribute(key)) {
          state._p[cleanupKey] = () => el.removeAttribute(key)
        }
      }
    }
    if (styleKeys.size && el.hasAttribute('style'))
      state._p[`${tag}:attr:style`] = (next?: StyleDeclarations) => removeStyles(el.style, styleKeys, next)
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
        state._s = state._p = {}
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
    function track(key: string, fn: () => void, fresh?: boolean) {
      // reuse the previous render's cleanup for a stable key: same $el/attr/class means an identical
      // closure, so this avoids reallocating ~one closure per tracked prop every frame. `fresh` opts
      // out for content closures, which capture a value that can change between renders.
      renderState._s[key] = (!fresh && previous[key]) || fn
      delete previous[key]
    }

    function seedAttrCleanups(id: string, $el: Element) {
      for (const k of $el.getAttributeNames()) {
        const ck = `${id}:attr:${k}`
        if (k === 'class') {
          for (const c of $el.classList)
            previous[`${ck}:${c}`] = () => $el.classList.remove(c)
        }
        if (k === 'style') {
          const style = ($el as HTMLElement).style
          const keys = Array.from({ length: style.length }, (_, i) => style.item(i))
          previous[ck] = (next?: StyleDeclarations) => next ? removeStyles(style, keys, next) : $el.removeAttribute(k)
        }
        else {
          previous[ck] = () => $el.removeAttribute(k)
        }
      }
    }

    function trackEvent(id: string, k: string, ev: string, source: DomEventHandler, $el: Element, target: EventTarget) {
      const key = `${id}:event:${k}`
      const prev = renderState._l.get(key)
      // same target/source: keep the existing listener, just re-track its cleanup
      if (prev && prev[0] === target && prev[1] === source) {
        track(key, prev[3])
        return
      }
      prev?.[3]()
      const dk = `data-${k}`
      const handler = ((e: Event) => source.call($el, e)) as EventListener
      const cleanup = () => {
        target.removeEventListener(ev, handler)
        if ($el.getAttribute(dk) === '')
          $el.removeAttribute(dk)
        if (renderState._l.get(key)?.[2] === handler)
          renderState._l.delete(key)
      }
      target.addEventListener(ev, handler)
      renderState._l.set(key, [target, source, handler, cleanup])
      $el.setAttribute(dk, '')
      // fresh: this cleanup removes a brand-new listener, the stale _p entry points at the old one
      track(key, cleanup, true)
    }

    function trackCtx({ id, $el, tag }: DomRenderTagContext & { $el: Element }) {
      renderState._e.set(id, $el)
      const adopted = renderState._a.delete($el)
      if (adopted)
        seedAttrCleanups(id, $el)
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
          const style = ($el as HTMLElement).style
          const declarations = v as unknown as StyleDeclarations
          // Removing a shorthand can clear a longhand the next render still needs.
          const cleanup = previous[ck] as StyleCleanup | undefined
          cleanup?.(declarations)
          for (const [sk, sv] of declarations)
            style.setProperty(sk, sv)
          const keys = [...declarations.keys()]
          track(ck, (next?: StyleDeclarations) => removeStyles(style, keys, next), true)
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
      // Unclaimed scan candidates must still belong to this document before adoption.
      if (ctx.$el && renderState._a.has(ctx.$el) && !dom.contains(ctx.$el)) {
        renderState._e.delete(id)
        ctx.$el = undefined
      }
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
        if (renderState._s[trackedKey] === undefined && previous[trackedKey] === undefined && !dom.contains($el))
          renderState._e.delete(key)
        else
          tracked.add($el)
      }
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
