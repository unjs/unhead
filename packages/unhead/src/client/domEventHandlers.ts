import type { RenderDomEvent, Unhead } from '../types'

export const renderDomEvent: RenderDomEvent = (state, id, tag, element, name, source, track) => {
  const type = name.slice(2)
  const view = element.ownerDocument.defaultView
  if ((element as HTMLElement).dataset?.[`${name}fired`])
    source.call(element, new (view?.Event || Event)(type))

  const key = `${id}:event:${name}`
  const target = tag === 'bodyAttrs' && view ? view : element
  const listeners = state._l ||= new Map()
  const previous = listeners.get(key)
  if (previous && previous[0] === target && previous[1] === source) {
    track(key, previous[2])
    return
  }
  previous?.[2]()
  const marker = `data-${name}`
  const handler = (event: Event) => source.call(element, event)
  const cleanup = () => {
    target.removeEventListener(type, handler)
    if (element.getAttribute(marker) === '')
      element.removeAttribute(marker)
    if (listeners.get(key)?.[2] === cleanup)
      listeners.delete(key)
  }
  target.addEventListener(type, handler)
  listeners.set(key, [target, source, cleanup])
  element.setAttribute(marker, '')
  track(key, cleanup, true)
}

/** Enable DOM event handlers for this client head. */
export function enableDomEventHandlers(head: Unhead<any>): void {
  if (!head.ssr && !head._domEvent) {
    head._domEvent = renderDomEvent
    head.dirty = true
  }
}
