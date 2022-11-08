import { TagsWithInnerContent, createElement } from 'zhead'
import type { DomRenderTagContext, HeadClient } from '@unhead/schema'
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
    const renderCtx: DomRenderTagContext = { tag, document: dom, head }
    await head.hooks.callHook('dom:renderTag', renderCtx)

    const entry = head.headEntries().find(e => e._i === Number(tag._e))!

    if (tag.tag === 'title' && tag.children) {
      // we don't handle title side effects
      dom.title = tag.children
      continue
    }

    if (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs') {
      setAttributesWithSideEffects(head, dom[tag.tag === 'htmlAttrs' ? 'documentElement' : 'body'], entry, tag)
      continue
    }

    const sdeKey = `${tag._s || tag._p}:el`
    const $newEl = createElement(tag, dom)
    let $previousEl: Element | null = null
    // optimised scan of children
    for (const $el of dom[tag.tagPosition?.startsWith('body') ? 'body' : 'head'].children) {
      if ($el.hasAttribute(`${tag._s}`)) {
        $previousEl = $el
        break
      }
    }

    // updating an existing tag
    if ($previousEl) {
      // safe to ignore removal
      head._removeQueuedSideEffect(sdeKey)

      if ($newEl.isEqualNode($previousEl))
        continue
      if (Object.keys(tag.props).length === 0) {
        $previousEl.remove()
        continue
      }
      setAttributesWithSideEffects(head, $previousEl, entry, tag)
      if (TagsWithInnerContent.includes(tag.tag))
        $previousEl.innerHTML = tag.children || ''

      // may be a duplicate but it's okay
      entry._sde[sdeKey] = () => $previousEl?.remove()
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
