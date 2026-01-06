import type {
  DomBeforeRenderCtx,
  DomRenderTagContext,
  DomState,
  HeadRenderer,
  HeadTag,
  RenderDomHeadOptions,
  Unhead,
} from '../types'
import { HasElementTags } from '../utils/const'
import { dedupeKey, hashTag, isMetaArrayDupeKey } from '../utils/dedupe'
import { callHook } from '../utils/hooks'
import { normalizeProps } from '../utils/normalize'
import { resolveTags } from '../utils/resolve'

/* @__NO_SIDE_EFFECTS__ */
export function createDomRenderer(options: RenderDomHeadOptions = {}): HeadRenderer<boolean> {
  return (head: Unhead<any>) => _renderDOMHead(head, options)
}

/**
 * Render the head tags to the DOM.
 * @deprecated Use `head.render()` instead.
 */
export function renderDOMHead<T extends Unhead<any>>(head: T, options: RenderDomHeadOptions = {}): boolean {
  return _renderDOMHead(head, options)
}

function _renderDOMHead<T extends Unhead<any>>(head: T, options: RenderDomHeadOptions = {}): boolean {
  const dom: Document | undefined = options.document || head.resolvedOptions.document
  if (!dom || !head.dirty)
    return false

  const beforeRenderCtx: DomBeforeRenderCtx = { shouldRender: true, tags: [] }
  callHook(head, 'dom:beforeRender', beforeRenderCtx)
  // allow integrations to block to the render
  if (!beforeRenderCtx.shouldRender)
    return false

  if (head._du)
    return false

  head._du = true
  let state = head._dom as DomState
  // let's hydrate - fill the elMap for fast lookups
  if (!state) {
    state = {
      _t: dom.title,
      _e: new Map([['htmlAttrs', dom.documentElement], ['bodyAttrs', dom.body]]),
      _p: {},
      _s: {},
    }

    for (const el of [...dom.body.children, ...dom.head.children]) {
      const tag = el.tagName.toLowerCase() as HeadTag['tag']
      if (!HasElementTags.has(tag))
        continue
      const props: Record<string, any> = { innerHTML: el.innerHTML }
      for (const name of el.getAttributeNames())
        props[name] = el.getAttribute(name)
      const next = normalizeProps({ tag, props: {} } as HeadTag, props)
      next.key = el.getAttribute('data-hid') || undefined
      let k = next._d = dedupeKey(next) || hashTag(next)
      let count = 1
      while (state._e.has(k))
        k = `${next._d}:${count++}`
      state._e.set(k, el)
    }

    // Pre-register side effects for SSR classes that entries claim to manage
    for (const entry of head.entries.values()) {
      if (entry._o !== undefined) {
        const orig = entry._o as Record<string, any>
        for (const tag of ['bodyAttrs', 'htmlAttrs'] as const) {
          const cls = orig[tag]?.class
          if (typeof cls === 'string') {
            const $el = state._e.get(tag)!
            for (const c of cls.split(/\s+/))
              c && (state._p[`${tag}:attr:class:${c}`] = () => $el.classList.remove(c))
          }
        }
        delete entry._o
      }
    }
  }
  else {
    state._p = { ...state._s }
  }
  state._s = {}

  function track(id: string, scope: string, fn: () => void) {
    const k = `${id}:${scope}`
    state._s[k] = fn
    delete state._p[k]
  }

  function trackCtx({ id, $el, tag }: DomRenderTagContext & { $el: Element }) {
    const isAttrTag = tag.tag.endsWith('Attrs')
    state._e.set(id, $el)
    if (!isAttrTag) {
      if (tag.textContent && tag.textContent !== $el.textContent) {
        $el.textContent = tag.textContent
      }
      if (tag.innerHTML && tag.innerHTML !== $el.innerHTML) {
        $el.innerHTML = tag.innerHTML
      }
      track(id, 'el', () => {
        $el?.remove()
        state._e.delete(id)
      })
    }
    for (const k in tag.props) {
      const value = tag.props[k]
      if (k[0] === 'o' && k[1] === 'n' && typeof value === 'function') {
        const ev = k.slice(2) // onload -> load
        const dataset = ($el as HTMLScriptElement | undefined)?.dataset
        if (dataset?.[`${k}fired`]) // onloadfired
          (value as (e: Event) => any).call($el, new Event(ev))
        if ($el.getAttribute(`data-${k}`) !== '') {
          (tag!.tag === 'bodyAttrs' ? dom!.defaultView! : $el).addEventListener(ev, (value as () => any).bind($el))
          $el.setAttribute(`data-${k}`, '')
        }
        continue
      }

      const ck = `attr:${k}`
      if (k === 'class' && value) {
        for (const c of value as Iterable<string>) {
          isAttrTag && track(id, `${ck}:${c}`, () => $el.classList.remove(c))
          !$el.classList.contains(c) && $el.classList.add(c)
        }
      }
      else if (k === 'style' && value) {
        for (const [sk, sv] of value as Iterable<[string, string]>) {
          track(id, `${ck}:${sk}`, () => ($el as HTMLElement).style.removeProperty(sk))
          ;($el as HTMLElement).style.setProperty(sk, sv)
        }
      }
      else if ((value as unknown) !== false && value !== null) {
        // attribute values get set directly
        $el.getAttribute(k) !== value && $el.setAttribute(k, (value as unknown) === true ? '' : String(value))
        isAttrTag && track(id, ck, () => $el.removeAttribute(k))
      }
    }
  }

  const pending: DomRenderTagContext[] = []
  const frag: Partial<Record<string, DocumentFragment>> = {}

  // resolve and process tags in single pass
  const rawTags = resolveTags(head, options.tagWeight ? { tagWeight: options.tagWeight } : undefined)
  const tags: DomRenderTagContext[] = []
  const dupeKeyCounter = new Map<string, number>()
  for (const tag of rawTags) {
    const count = dupeKeyCounter.get(tag._d!) || 0
    const id = (count ? `${tag._d}:${count}` : tag._d) || hashTag(tag)
    const ctx = { tag, id, shouldRender: true } as DomRenderTagContext
    if (tag._d && isMetaArrayDupeKey(tag._d)) {
      dupeKeyCounter.set(tag._d, count + 1)
    }
    tags.push(ctx)

    if (tag.tag === 'title') {
      dom.title = tag.textContent as string
      track('title', '', () => dom.title = state._t)
      continue
    }
    ctx.$el = state._e.get(id)
    if (ctx.$el) {
      trackCtx(ctx as DomRenderTagContext & { $el: Element })
    }
    else if (HasElementTags.has(tag.tag)) {
      pending.push(ctx)
    }
  }
  // 3. render tags which require a dom element to be created or requires scanning DOM to determine duplicate
  for (const ctx of pending) {
    // finally, we are free to make new elements
    const pos = ctx.tag.tagPosition || 'head'
    ctx.$el = dom.createElement(ctx.tag.tag)
    trackCtx(ctx as DomRenderTagContext & { $el: Element })
    ;(frag[pos] ??= dom.createDocumentFragment()).appendChild(ctx.$el)
  }
  // finally, write the tags
  frag.head && dom.head.appendChild(frag.head)
  frag.bodyOpen && dom.body.insertBefore(frag.bodyOpen, dom.body.firstChild)
  frag.bodyClose && dom.body.appendChild(frag.bodyClose)

  for (const k in state._p)
    state._p[k]()
  head._dom = state
  callHook(head, 'dom:rendered', { renders: tags })
  head._du = false
  head.dirty = false
  return true
}
