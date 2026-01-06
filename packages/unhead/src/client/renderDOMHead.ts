import type { DomBeforeRenderCtx, DomRenderTagContext, DomState, HeadRenderer, HeadTag, RenderDomHeadOptions, Unhead } from '../types'
import { HasElementTags } from '../utils/const'
import { dedupeKey, hashTag, isMetaArrayDupeKey } from '../utils/dedupe'
import { callHook } from '../utils/hooks'
import { normalizeProps } from '../utils/normalize'
import { resolveTags } from '../utils/resolve'

/* @__NO_SIDE_EFFECTS__ */
export function createDomRenderer(options: RenderDomHeadOptions = {}): HeadRenderer<boolean> {
  return (head: Unhead<any>) => _renderDOMHead(head, options)
}

export function renderDOMHead<T extends Unhead<any>>(head: T, options: RenderDomHeadOptions = {}): boolean {
  return _renderDOMHead(head, options)
}

function _renderDOMHead<T extends Unhead<any>>(head: T, options: RenderDomHeadOptions = {}): boolean {
  const dom: Document | undefined = options.document || head.resolvedOptions.document
  if (!dom || !head.dirty)
    return false
  const beforeRenderCtx: DomBeforeRenderCtx = { shouldRender: true, tags: [] }
  callHook(head, 'dom:beforeRender', beforeRenderCtx)
  if (!beforeRenderCtx.shouldRender || head._du)
    return false
  head._du = true
  let state = head._dom as DomState
  if (!state) {
    state = { _t: dom.title, _e: new Map([['htmlAttrs', dom.documentElement], ['bodyAttrs', dom.body]]), _p: {}, _s: {} }
    for (const el of [...dom.body.children, ...dom.head.children]) {
      const tag = el.tagName.toLowerCase() as HeadTag['tag']
      if (!HasElementTags.has(tag))
        continue
      const props: Record<string, any> = { innerHTML: el.innerHTML }
      for (const n of el.getAttributeNames())
        props[n] = el.getAttribute(n)
      const next = normalizeProps({ tag, props: {} } as HeadTag, props)
      next.key = el.getAttribute('data-hid') || undefined
      let k = next._d = dedupeKey(next) || hashTag(next)
      let c = 1
      while (state._e.has(k))
        k = `${next._d}:${c++}`
      state._e.set(k, el)
    }
    for (const entry of head.entries.values()) {
      if (entry._o !== undefined) {
        const orig = entry._o as Record<string, any>
        for (const t of ['bodyAttrs', 'htmlAttrs'] as const) {
          const cls = orig[t]?.class
          if (typeof cls === 'string') {
            const $el = state._e.get(t)!
            for (const c of cls.split(/\s+/)) {
              if (c)
                state._p[`${t}:attr:class:${c}`] = () => $el.classList.remove(c)
            }
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
    const isAttr = tag.tag.endsWith('Attrs')
    state._e.set(id, $el)
    if (!isAttr) {
      if (tag.textContent && tag.textContent !== $el.textContent)
        $el.textContent = tag.textContent
      if (tag.innerHTML && tag.innerHTML !== $el.innerHTML)
        $el.innerHTML = tag.innerHTML
      track(id, 'el', () => {
        $el?.remove()
        state._e.delete(id)
      })
    }
    for (const k in tag.props) {
      const v = tag.props[k]
      if (k[0] === 'o' && k[1] === 'n' && typeof v === 'function') {
        const ev = k.slice(2)
        if (($el as HTMLScriptElement)?.dataset?.[`${k}fired`])
          (v as (e: Event) => any).call($el, new Event(ev))
        if ($el.getAttribute(`data-${k}`) !== '') {
          (tag.tag === 'bodyAttrs' ? dom!.defaultView! : $el).addEventListener(ev, (v as () => any).bind($el))
          $el.setAttribute(`data-${k}`, '')
        }
        continue
      }
      const ck = `attr:${k}`
      if (k === 'class' && v) {
        for (const c of v as Iterable<string>) {
          if (isAttr)
            track(id, `${ck}:${c}`, () => $el.classList.remove(c))
          if (!$el.classList.contains(c))
            $el.classList.add(c)
        }
      }
      else if (k === 'style' && v) {
        for (const [sk, sv] of v as Iterable<[string, string]>) {
          track(id, `${ck}:${sk}`, () => ($el as HTMLElement).style.removeProperty(sk))
          ;($el as HTMLElement).style.setProperty(sk, sv)
        }
      }
      else if (v !== false as any && v !== null) {
        if ($el.getAttribute(k) !== v as any)
          $el.setAttribute(k, v === true as any ? '' : String(v))
        if (isAttr)
          track(id, ck, () => $el.removeAttribute(k))
      }
    }
  }

  const pending: DomRenderTagContext[] = []
  const frag: Partial<Record<string, DocumentFragment>> = {}
  const rawTags = resolveTags(head, options.tagWeight ? { tagWeight: options.tagWeight } : undefined)
  const tags: DomRenderTagContext[] = []
  const dupeKeyCounter = new Map<string, number>()
  for (const tag of rawTags) {
    const count = dupeKeyCounter.get(tag._d!) || 0
    const id = (count ? `${tag._d}:${count}` : tag._d) || hashTag(tag)
    const ctx = { tag, id, shouldRender: true } as DomRenderTagContext
    if (tag._d && isMetaArrayDupeKey(tag._d))
      dupeKeyCounter.set(tag._d, count + 1)
    tags.push(ctx)
    if (tag.tag === 'title') {
      dom.title = tag.textContent as string
      track('title', '', () => dom.title = state._t)
      continue
    }
    ctx.$el = state._e.get(id)
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
  for (const k in state._p)
    state._p[k]()
  head._dom = state
  callHook(head, 'dom:rendered', { renders: tags })
  head._du = false
  head.dirty = false
  return true
}
