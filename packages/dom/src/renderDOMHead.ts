import { HasElementTags, hashTag, normaliseProps, tagDedupeKey } from '@unhead/shared'
import type {
  DomBeforeRenderCtx,
  DomRenderTagContext,
  DomState,
  HeadTag,
  Unhead,
} from '@unhead/schema'

export interface RenderDomHeadOptions {
  /**
   * Document to use for rendering. Allows stubbing for testing.
   */
  document?: Document
}

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
    const tags = (await head.resolveTags())
      .map(tag => <DomRenderTagContext> {
        tag,
        id: HasElementTags.has(tag.tag) ? hashTag(tag) : tag.tag,
        shouldRender: true,
      })
    let state = head._dom as DomState
    // let's hydrate - fill the elMap for fast lookups
    if (!state) {
      state = {
        elMap: { htmlAttrs: dom.documentElement, bodyAttrs: dom.body },
      } as any as DomState

      const takenDedupeKeys = new Set()

      for (const key of ['body', 'head']) {
        const children = dom[key as 'head' | 'body']?.children
        const tags: HeadTag[] = []
        for (const c of children) {
          const tag = c.tagName.toLowerCase() as HeadTag['tag']
          if (!HasElementTags.has(tag)) {
            continue
          }
          const t: HeadTag = {
            tag,
            props: await normaliseProps(
              c.getAttributeNames()
                .reduce((props, name) => ({ ...props, [name]: c.getAttribute(name) }), {}),
            ),
            innerHTML: c.innerHTML,
          }
          // we need to account for the fact that duplicate tags may exist as some are supported, increment the dedupe key
          const dedupeKey = tagDedupeKey(t)
          let d = dedupeKey
          let i = 1
          while (d && takenDedupeKeys.has(d))
            d = `${dedupeKey}:${i++}`
          if (d) {
            t._d = d
            takenDedupeKeys.add(d)
          }
          tags.push(t)
          state.elMap[c.getAttribute('data-hid') || hashTag(t)] = c
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
      state.elMap[id] = $el
      if (!isAttrTag) {
        if (tag.textContent && tag.textContent !== $el.textContent) {
          $el.textContent = tag.textContent
        }
        if (tag.innerHTML && tag.innerHTML !== $el.innerHTML) {
          $el.innerHTML = tag.innerHTML
        }
        track(id, 'el', () => {
          // the element may have been removed by a duplicate tag or something out of our control
          state.elMap[id]?.remove()
          delete state.elMap[id]
        })
      }
      if (tag._eventHandlers) {
        // we need to attach event listeners as they can have side effects such as onload
        for (const k in tag._eventHandlers) {
          if (!Object.prototype.hasOwnProperty.call(tag._eventHandlers, k)) {
            continue
          }

          if ($el.getAttribute(`data-${k}`) !== '') {
            // avoid overriding
            (tag!.tag === 'bodyAttrs' ? dom!.defaultView! : $el).addEventListener(
              // onload -> load
              k.substring(2),
              tag._eventHandlers[k].bind($el),
            )
            $el.setAttribute(`data-${k}`, '')
          }
        }
      }
      for (const k in tag.props) {
        if (!Object.prototype.hasOwnProperty.call(tag.props, k)) {
          continue
        }
        const value = tag.props[k]

        const ck = `attr:${k}`
        // class attributes have their own side effects to allow for merging
        if (k === 'class') {
          if (!value) {
            continue
          }
          // if the user is providing an empty string, then it's removing the class
          // the side effect clean up should remove it
          for (const c of value.split(' ')) {
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
          for (const c of value.split(';')) {
            const propIndex = c.indexOf(':')
            const k = c.substring(0, propIndex).trim()
            const v = c.substring(propIndex + 1).trim()
            track(id, `${ck}:${k}`, () => {
              ($el as any as ElementCSSInlineStyle).style.removeProperty(k)
            })
            ;($el as any as ElementCSSInlineStyle).style.setProperty(k, v)
          }
        }
        else {
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

    // first render all tags which we can match quickly
    for (const ctx of tags) {
      const { tag, shouldRender, id } = ctx
      if (!shouldRender)
        continue
      // 1. render tags which don't create a new element
      if (tag.tag === 'title') {
        dom.title = tag.textContent as string
        continue
      }
      ctx.$el = ctx.$el || state.elMap[id]
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
    // call hook
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
    head._domUpdatePromise = undefined
    head._dom = state
    head.dirty = false
    await head.hooks.callHook('dom:rendered', { renders: tags })
    resolve()
  })
  return head._domUpdatePromise
}
