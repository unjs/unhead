import { createElement } from 'zhead'
import type { DomRenderTagContext, HeadClient, SideEffectsRecord } from '../../types'
import { setAttributes } from './setAttributes'

let domUpdatePromise: Promise<void> | null = null

export interface RenderDomHeadOptions {
  document?: Document
}

export const renderDOMHead = async<T extends HeadClient<any>>(head: T, options: RenderDomHeadOptions = {}) => {
  const dom: Document = options.document || window.document

  const tags = await head.resolveTags()

  await head.hooks.callHook('dom:beforeRender', { head, tags, document: dom })

  // start with a clean slate
  head._flushDomSideEffects()

  const sideEffectMap: Record<number, SideEffectsRecord> = {}
  // default is to only create tags, not to resolve state
  for (const tag of tags) {
    sideEffectMap[tag._e!] = sideEffectMap[tag._e!] || {}
    // if we can hydrate an element via the selector id, do that instead of creating a new one
    let $el = tag._s ? dom.querySelector(`[${tag._s}]`) : null
    const renderCtx: DomRenderTagContext = { tag, document: dom, $el, head }
    await head.hooks.callHook('dom:renderTag', renderCtx)
    // updating an existing tag
    if ($el) {
      if (Object.keys(tag.props).length === 0) {
        $el.remove()
        continue
      }
      sideEffectMap[tag._e!] = {
        ...sideEffectMap[tag._e!],
        ...setAttributes($el, tag),
      }
      $el.innerHTML = tag.children || ''
      sideEffectMap[tag._e!][`${tag._p}:el:remove`] = () => $el?.remove()
      continue
    }

    if (tag.tag === 'title' && tag.children) {
      dom.title = tag.children
      continue
    }

    if (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs') {
      sideEffectMap[tag._e!] = {
        ...sideEffectMap[tag._e!],
        ...setAttributes(dom[tag.tag === 'htmlAttrs' ? 'documentElement' : 'body'], tag),
      }
      continue
    }

    $el = createElement(tag, dom)

    switch (tag.tagPosition) {
      case 'bodyClose':
        dom.body.appendChild($el)
        break
      case 'bodyOpen':
        dom.body.insertBefore($el, dom.body.firstChild)
        break
      case 'head':
      default:
        dom.head.appendChild($el)
        break
    }

    sideEffectMap[tag._e!][`${tag._p}:el:remove`] = () => $el?.remove()
  }

  // add side effects once we've rendered
  for (const k in sideEffectMap) {
    const entry = head.headEntries().find(e => e._i === Number(k))!
    entry._sde = {
      ...entry._sde,
      ...sideEffectMap[k],
    }
  }
}

export const debouncedUpdateDom = async<T extends HeadClient<any>>(delayedFn: (fn: () => void) => void, head: T, options: RenderDomHeadOptions = {}) => {
  // within the debounced dom update we need to compute all the tags so that watchEffects still works
  function doDomUpdate() {
    domUpdatePromise = null
    return renderDOMHead(head, options)
  }

  return domUpdatePromise = domUpdatePromise || new Promise(resolve => delayedFn(() => resolve(doDomUpdate())))
}
