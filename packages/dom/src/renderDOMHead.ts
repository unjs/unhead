import { TagsWithInnerContent, createElement } from 'zhead'
import type { BeforeRenderContext, DomRenderTagContext, HeadEntry, HeadTag, Unhead } from '@unhead/schema'

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
  const dom: Document = options.document || window.document
  const tags = await head.resolveTags()

  const ctx: BeforeRenderContext = { shouldRender: true, tags }
  await head.hooks.callHook('dom:beforeRender', ctx)
  // allow integrations to block to the render
  if (!ctx.shouldRender)
    return

  // queue everything to be deleted, and then we'll conditionally remove side effects which we don't want to fire
  const queuedSideEffects = head._popSideEffectQueue()
  head.headEntries()
    .map(entry => entry._sde)
    .forEach((sde) => {
      Object.entries(sde).forEach(([key, fn]) => {
        queuedSideEffects[key] = fn
      })
    })

  const renderTag = (tag: HeadTag, entry: HeadEntry<any>) => {
    if (tag.tag === 'title' && tag.children) {
      // we don't handle title side effects
      dom.title = tag.children
      return
    }

    const markSideEffect = (key: string, fn: () => void) => {
      key = `${tag._s || tag._p}:${key}`
      entry._sde[key] = fn
      delete queuedSideEffects[key]
    }

    /**
     * Set attributes on a DOM element, while adding entry side effects.
     */
    const setAttrs = ($el: Element) => {
      // add new attributes
      Object.entries(tag.props).forEach(([k, value]) => {
        value = String(value)
        const attrSdeKey = `attr:${k}`
        // class attributes have their own side effects to allow for merging
        if (k === 'class') {
          for (const c of value.split(' ')) {
            const classSdeKey = `${attrSdeKey}:${c}`
            // always clear side effects
            markSideEffect(classSdeKey, () => $el.classList.remove(c))

            if (!$el.classList.contains(c))
              $el.classList.add(c)
          }
          return
        }
        // always clear side effects
        if (!k.startsWith('data-h-'))
          markSideEffect(attrSdeKey, () => $el.removeAttribute(k))

        if ($el.getAttribute(k) !== value)
          $el.setAttribute(k, value)
      })
    }

    if (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs') {
      setAttrs(dom[tag.tag === 'htmlAttrs' ? 'documentElement' : 'body'])
      return
    }

    let $newEl = createElement(tag, dom)
    let $previousEl: Element | undefined
    // optimised scan of children
    for (const $el of dom[tag.tagPosition?.startsWith('body') ? 'body' : 'head'].children) {
      if ($el.hasAttribute(`${tag._s}`) || $el.isEqualNode($newEl)) {
        $previousEl = $el
        break
      }
    }

    // updating an existing tag
    if ($previousEl) {
      markSideEffect('el', () => $previousEl?.remove())

      // @todo test around empty tags
      if (Object.keys(tag.props).length === 0) {
        $previousEl.remove()
        return
      }
      if ($newEl.isEqualNode($previousEl))
        return

      setAttrs($previousEl)
      if (TagsWithInnerContent.includes(tag.tag))
        $previousEl.innerHTML = tag.children || ''
      return
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
  }

  for (const tag of ctx.tags) {
    const renderCtx: DomRenderTagContext = { shouldRender: true, tag }
    await head.hooks.callHook('dom:renderTag', renderCtx)
    if (!renderCtx.shouldRender)
      continue

    renderTag(tag, head.headEntries().find(e => e._i === Number(tag._e))!)
  }

  // clear all side effects still pending
  Object.values(queuedSideEffects).forEach(fn => fn())
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
  const delayFn = options.delayFn || (fn => setTimeout(fn, 25))
  return domUpdatePromise = domUpdatePromise || new Promise(resolve => delayFn(() => resolve(doDomUpdate())))
}
