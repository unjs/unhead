import type {
  DomBeforeRenderCtx,
  DomRenderTagContext,
  DomState,
  HeadTag,
  RenderDomHeadOptions,
  Unhead,
} from '../types'
import { HasElementTags } from '../utils/const'
import { dedupeKey, hashTag, isMetaArrayDupeKey } from '../utils/dedupe'
import { normalizeProps } from '../utils/normalize'
import { resolveTags } from '../utils/resolve'

/**
 * Render the head tags to the DOM.
 */
export async function renderDOMHead<T extends Unhead<any>>(head: T, options: RenderDomHeadOptions = {}) {
  const dom: Document | undefined = options.document || head.resolvedOptions.document
  if (!dom || !head.dirty)
    return

  const beforeRenderCtx: DomBeforeRenderCtx = { shouldRender: true, tags: [] }
  await head.hooks.callHook('dom:beforeRender', beforeRenderCtx)
  // allow integrations to block to the render
  if (!beforeRenderCtx.shouldRender)
    return

  if (head._domUpdatePromise) {
    return head._domUpdatePromise
  }
  // eslint-disable-next-line no-async-promise-executor
  head._domUpdatePromise = new Promise<void>(async (resolve) => {
    const dupeKeyCounter = new Map<string, number>()
    // allow state to be hydrated while we generate the tags
    const resolveTagPromise = new Promise<DomRenderTagContext[]>((resolve) => {
      const tags = resolveTags(head)
      resolve(
        tags.map((tag) => {
          const count = dupeKeyCounter.get(tag._d!) || 0
          const res = {
            tag,
            id: (count ? `${tag._d}:${count}` : tag._d) || hashTag(tag),
            shouldRender: true,
          }
          if (tag._d && isMetaArrayDupeKey(tag._d)) {
            dupeKeyCounter.set(tag._d, count + 1)
          }
          return res
        }) as DomRenderTagContext[],
      )
    })

    let state = head._dom as DomState
    // let's hydrate - fill the elMap for fast lookups
    if (!state) {
      state = {
        title: dom.title,
        elMap: new Map()
          .set('htmlAttrs', dom.documentElement)
          .set('bodyAttrs', dom.body),
      } as any as DomState

      for (const key of ['body', 'head']) {
        const children = dom[key as 'head' | 'body']?.children
        // const tags: HeadTag[] = []
        for (const c of children) {
          const tag = c.tagName.toLowerCase() as HeadTag['tag']
          if (!HasElementTags.has(tag)) {
            continue
          }
          const next = normalizeProps({ tag, props: {} } as HeadTag, {
            innerHTML: c.innerHTML,
            ...c.getAttributeNames()
              .reduce((props, name) => {
                // @ts-expect-error untyped
                props[name] = c.getAttribute(name)
                return props
              }, {}) || {},
          })
          next.key = c.getAttribute('data-hid') || undefined
          next._d = dedupeKey(next) || hashTag(next)
          if (state.elMap.has(next._d)) {
            let count = 1
            let k = next._d
            while (state.elMap.has(k)) {
              k = `${next._d}:${count++}`
            }
            state.elMap.set(k, c)
          }
          else {
            state.elMap.set(next._d, c)
          }
        }
      }
    }

    // presume all side effects are stale, we mark them as not stale if they're re-introduced
    state.pendingSideEffects = { ...state.sideEffects }
    state.sideEffects = {}

    function track(id: string, scope: string, fn: () => void) {
      const k = `${id}:${scope}`
      state.sideEffects[k] = fn
      delete state.pendingSideEffects[k]
    }

    function trackCtx({ id, $el, tag }: DomRenderTagContext) {
      const isAttrTag = tag.tag.endsWith('Attrs')
      state.elMap.set(id, $el)
      if (!isAttrTag) {
        if (tag.textContent && tag.textContent !== $el.textContent) {
          $el.textContent = tag.textContent
        }
        if (tag.innerHTML && tag.innerHTML !== $el.innerHTML) {
          $el.innerHTML = tag.innerHTML
        }
        track(id, 'el', () => {
          // the element may have been removed by a duplicate tag or something out of our control
          $el?.remove()
          state.elMap.delete(id)
        })
      }
      for (const k in tag.props) {
        if (!Object.prototype.hasOwnProperty.call(tag.props, k))
          continue
        const value = tag.props[k]
        if (k.startsWith('on') && typeof value === 'function') {
          const dataset = ($el as HTMLScriptElement | undefined)?.dataset
          // check if it was already fired
          if (dataset && dataset[`${k}fired`]) {
            // onloadfired -> onload
            const ek = k.slice(0, -5)
            // onload -> load
            // @ts-expect-error untyped
            ;(value as () => any).call($el, new Event(ek.substring(2)))
          }

          if ($el.getAttribute(`data-${k}`) !== '') {
            // avoid overriding
            (tag!.tag === 'bodyAttrs' ? dom!.defaultView! : $el).addEventListener(
              // onload -> load
              k.substring(2),
              (value as () => any).bind($el),
            )
            $el.setAttribute(`data-${k}`, '')
          }
          continue
        }

        const ck = `attr:${k}`
        // class attributes have their own side effects to allow for merging
        if (k === 'class') {
          if (!value) {
            continue
          }
          // if the user is providing an empty string, then it's removing the class
          // the side effect clean up should remove it
          for (const c of value as any as Set<string>) {
            // always clear side effects
            isAttrTag && track(id, `${ck}:${c}`, () => $el.classList.remove(c))
            !$el.classList.contains(c) && $el.classList.add(c)
          }
        }
        else if (k === 'style') {
          if (!value) {
            continue
          }
          // style attributes have their own side effects to allow for merging
          for (const [k, v] of value as any as Map<string, string>) {
            track(id, `${ck}:${k}`, () => {
              ($el as any as ElementCSSInlineStyle).style.removeProperty(k)
            })
            ;($el as any as ElementCSSInlineStyle).style.setProperty(k, v)
          }
        }
        // @ts-expect-error untyped
        else if (value !== false && value !== null) {
          // attribute values get set directly
          $el.getAttribute(k) !== value && $el.setAttribute(k, (value as string | boolean) === true ? '' : String(value))
          isAttrTag && track(id, ck, () => $el.removeAttribute(k))
        }
      }
    }

    const pending: DomRenderTagContext[] = []
    const frag: Record<Required<HeadTag>['tagPosition'], undefined | DocumentFragment> = {
      bodyClose: undefined,
      bodyOpen: undefined,
      head: undefined,
    } as const

    const tags = await resolveTagPromise
    // first render all tags which we can match quickly
    for (const ctx of tags) {
      const { tag, shouldRender, id } = ctx
      if (!shouldRender)
        continue
      // 1. render tags which don't create a new element
      if (tag.tag === 'title') {
        dom.title = tag.textContent as string
        track('title', '', () => dom.title = state.title)
        continue
      }
      ctx.$el = ctx.$el || state.elMap.get(id)
      if (ctx.$el) {
        trackCtx(ctx)
      }
      else if (HasElementTags.has(tag.tag)) {
        // tag does not exist, we need to render it (if it's an element tag)
        pending.push(ctx)
      }
    }
    // 3. render tags which require a dom element to be created or requires scanning DOM to determine duplicate
    for (const ctx of pending) {
      // finally, we are free to make new elements
      const pos = ctx.tag.tagPosition || 'head'
      ctx.$el = dom.createElement(ctx.tag.tag)
      trackCtx(ctx)
      frag[pos] = frag[pos] || dom.createDocumentFragment()
      frag[pos]!.appendChild(ctx.$el)
    }
    // TODO remove
    for (const ctx of tags)
      await head.hooks.callHook('dom:renderTag', ctx, dom, track)
    // finally, write the tags
    frag.head && dom.head.appendChild(frag.head)
    frag.bodyOpen && dom.body.insertBefore(frag.bodyOpen, dom.body.firstChild)
    frag.bodyClose && dom.body.appendChild(frag.bodyClose)

    // clear all side effects still pending
    for (const k in state.pendingSideEffects) {
      state.pendingSideEffects[k]()
    }
    head._dom = state
    await head.hooks.callHook('dom:rendered', { renders: tags })
    resolve()
  }).finally(() => {
    head._domUpdatePromise = undefined
    head.dirty = false
  })
  return head._domUpdatePromise
}
