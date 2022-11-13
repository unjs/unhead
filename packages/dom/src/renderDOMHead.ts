import { TagsWithInnerContent, tagDedupeKey } from 'zhead'
import type {
  BeforeRenderContext,
  DomRenderTagContext,
  HeadEntry,
  HeadTag,
  SideEffectsRecord,
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
  const ctx: BeforeRenderContext = { shouldRender: true }
  await head.hooks.callHook('dom:beforeRender', ctx)
  // allow integrations to block to the render
  if (!ctx.shouldRender)
    return

  const dom: Document = options.document || window.document

  // queue everything to be deleted, and then we'll conditionally remove side effects which we don't want to fire
  // run queued side effects immediately

  // presume all side effects are stale, we mark them as not stale if they're re-introduced
  const staleSideEffects: SideEffectsRecord = head._popSideEffectQueue()
  head.headEntries()
    .map(entry => entry._sde)
    .forEach((sde) => {
      Object.entries(sde).forEach(([key, fn]) => {
        staleSideEffects[key] = fn
      })
    })

  const renderTag = (tag: HeadTag, entry: HeadEntry<any>) => {
    if (tag.tag === 'title' && tag.children) {
      // we don't handle title side effects
      dom.title = tag.children
      return dom.head.querySelector('title')
    }

    const markSideEffect = (key: string, fn: () => void) => {
      key = `${tag._d || tag._p}:${key}`
      entry._sde[key] = fn
      delete staleSideEffects[key]
    }

    /**
     * Set attributes on a DOM element, while adding entry side effects.
     */
    const setAttrs = ($el: Element, sideEffects = true) => {
      // add new attributes
      Object.entries(tag.props).forEach(([k, value]) => {
        value = String(value)
        const attrSdeKey = `attr:${k}`

        // class attributes have their own side effects to allow for merging
        if (k === 'class') {
          for (const c of value.split(' ')) {
            const classSdeKey = `${attrSdeKey}:${c}`
            // always clear side effects
            sideEffects && markSideEffect(classSdeKey, () => $el.classList.remove(c))

            if (!$el.classList.contains(c))
              $el.classList.add(c)
          }
          return
        }
        // always clear side effects
        if (sideEffects && !k.startsWith('data-h-'))
          markSideEffect(attrSdeKey, () => $el.removeAttribute(k))

        if ($el.getAttribute(k) !== value)
          $el.setAttribute(k, value)
      })
      // @todo test side effects?
      if (TagsWithInnerContent.includes(tag.tag))
        $el.innerHTML = tag.children || ''
    }

    if (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs') {
      const $el = dom[tag.tag === 'htmlAttrs' ? 'documentElement' : 'body']
      setAttrs($el)
      return $el
    }

    let $newEl: Element = dom.createElement(tag.tag)
    // don't track side effects for new elements as the element itself should be deleted
    setAttrs($newEl, false)

    let $previousEl: Element | undefined
    // optimised scan of children
    for (const $el of dom[tag.tagPosition?.startsWith('body') ? 'body' : 'head'].children) {
      const elTag = $el.tagName.toLowerCase() as HeadTag['tag']
      if (elTag !== tag.tag)
        continue
      const key = $el.getAttribute('data-h-key') || tagDedupeKey({
        // @ts-expect-error untyped
        tag: $el.tagName.toLowerCase(),
        // convert attributes to object
        props: Array.from($el.attributes)
          .map(attr => [attr.name, attr.value])
          .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
      })
      if ((key === tag._d || $el.isEqualNode($newEl))) {
        $previousEl = $el
        break
      }
    }
    // updating an existing tag
    if ($previousEl) {
      markSideEffect('el', () => {
        $previousEl?.remove()
      })
      setAttrs($previousEl, false)
      return $previousEl
    }

    switch (tag.tagPosition) {
      case 'bodyClose':
        $newEl = dom.body.appendChild($newEl)
        break
      case 'bodyOpen':
        $newEl = dom.body.insertBefore($newEl, dom.body.firstChild)
        break
      case 'head':
      default:
        $newEl = dom.head.appendChild($newEl)
        break
    }

    markSideEffect('el', () => $newEl?.remove())
    return $newEl
  }

  for (const tag of await head.resolveTags()) {
    const entry = head.headEntries().find(e => e._i === Number(tag._e))!
    const renderCtx: DomRenderTagContext = { $el: null, shouldRender: true, tag, entry, queuedSideEffects: staleSideEffects }
    await head.hooks.callHook('dom:beforeRenderTag', renderCtx)
    if (!renderCtx.shouldRender)
      continue
    renderCtx.$el = renderTag(renderCtx.tag, renderCtx.entry)
    await head.hooks.callHook('dom:renderTag', renderCtx)
  }

  // clear all side effects still pending
  Object.values(staleSideEffects).forEach(fn => fn())
}

/**
 * Global instance of the dom update promise. Used for debounding head updates.
 */
export let domUpdatePromise: Promise<void> | null = null

/**
 * Queue a debounced update of the DOM head.
 */
export async function debouncedRenderDOMHead<T extends Unhead<any>>(head: T, options: RenderDomHeadOptions & { delayFn?: (fn: () => void) => void } = {}) {
  // within the debounced dom update we need to compute all the tags so that watchEffects still works
  function doDomUpdate() {
    domUpdatePromise = null
    return renderDOMHead(head, options)
  }
  // we want to delay for the hydration chunking
  const delayFn = options.delayFn || (fn => setTimeout(fn, 10))
  return domUpdatePromise = domUpdatePromise || new Promise(resolve => delayFn(() => resolve(doDomUpdate())))
}
