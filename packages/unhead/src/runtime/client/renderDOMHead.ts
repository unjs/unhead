import { TagsWithInnerContent, createElement } from 'zhead'
import type { DomRenderTagContext, HeadClient } from '../../types'
import { setAttributesWithSideEffects } from './setAttributesWithSideEffects'

export interface RenderDomHeadOptions {
  /**
   * Document to use for rendering. Allows stubbing for testing.
   */
  document?: Document
}

/**
 * Render the head tags to the DOM.
 */
export async function renderDOMHead<T extends HeadClient<any>>(head: T, options: RenderDomHeadOptions = {}) {
  const dom: Document = options.document || window.document

  const tags = await head.resolveTags()

  await head.hooks.callHook('dom:beforeRender', { head, tags, document: dom })

  for (const tag of tags) {
    const entry = head.headEntries().find(e => e._i === Number(tag._e))!
    const sdeKey = `${tag._s || tag._p}:el`

    const $newEl = createElement(tag, dom)
    // try hydrate state
    const $el = tag._s ? dom.querySelector(`[${tag._s}]`) : null
    const renderCtx: DomRenderTagContext = { tag, document: dom, head }
    await head.hooks.callHook('dom:renderTag', renderCtx)
    // updating an existing tag
    if ($el) {
      // safe to ignore removal
      head._removeQueuedSideEffect(sdeKey)

      if ($newEl.isEqualNode($el))
        continue
      if (Object.keys(tag.props).length === 0) {
        $el.remove()
        continue
      }
      setAttributesWithSideEffects(head, $el, entry, tag)
      if (TagsWithInnerContent.includes(tag.tag))
        $el.innerHTML = tag.children || ''

      // may be a duplicate but it's okay
      entry._sde[sdeKey] = () => $el?.remove()
      continue
    }

    if (tag.tag === 'title' && tag.children) {
      // we don't handle title side effects
      dom.title = tag.children
      continue
    }

    if (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs') {
      setAttributesWithSideEffects(head, dom[tag.tag === 'htmlAttrs' ? 'documentElement' : 'body'], entry, tag)
      continue
    }

    switch (tag.tagPosition) {
      case 'bodyClose':
        dom.body.appendChild($newEl)
        break
      case 'bodyOpen':
        dom.body.insertBefore($newEl, dom.body.firstChild)
        break
      case 'head':
      default:
        dom.head.appendChild($newEl)
        break
    }
    entry._sde[sdeKey] = () => $newEl?.remove()
  }

  // run side effect cleanup
  head._flushQueuedSideEffects()
}

/**
 * Global instance of the dom update promise. Used for debounding head updates.
 */
export let domUpdatePromise: Promise<void> | null = null

/**
 * Queue a debounced update of the DOM head.
 */
export async function debouncedRenderDOMHead<T extends HeadClient<any>>(delayedFn: (fn: () => void) => void, head: T, options: RenderDomHeadOptions = {}) {
  // within the debounced dom update we need to compute all the tags so that watchEffects still works
  function doDomUpdate() {
    domUpdatePromise = null
    return renderDOMHead(head, options)
  }

  return domUpdatePromise = domUpdatePromise || new Promise(resolve => delayedFn(() => resolve(doDomUpdate())))
}
