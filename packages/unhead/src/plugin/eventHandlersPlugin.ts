import type { HeadTag } from '@unhead/schema'
import { defineHeadPlugin } from '@unhead/shared'

/**
 * Supports DOM event handlers (i.e `onload`) as functions.
 *
 * When SSR we need to strip out these values. On CSR we
 */
export const EventHandlersPlugin = () => {
  const stripEventHandlers = (mode: 'ssr' | 'dom', tag: HeadTag) => {
    const props: HeadTag['props'] = {}
    const eventHandlers: HeadTag['props'] = {}
    Object.entries(tag.props)
      .forEach(([key, value]) => {
        if (key.startsWith('on') && typeof value === 'function')
          eventHandlers[key] = value
        else
          props[key] = value
      })
    let delayedSrc: string | undefined
    if (mode === 'dom' && tag.tag === 'script' && typeof props.src === 'string' && typeof eventHandlers.onload !== 'undefined') {
      delayedSrc = props.src
      delete props.src
    }
    return { props, eventHandlers, delayedSrc }
  }

  return defineHeadPlugin({
    hooks: {
      'ssr:render': function (ctx) {
        // when server-side rendering we need to strip out all event handlers that are functions
        ctx.tags = ctx.tags.map((tag) => {
          tag.props = stripEventHandlers('ssr', tag).props
          return tag
        })
      },
      'dom:beforeRenderTag': function (ctx) {
        // we need to strip out all event handlers that are functions and add them on to the tag
        const { props, eventHandlers, delayedSrc } = stripEventHandlers('dom', ctx.tag)
        if (!Object.keys(eventHandlers).length)
          return

        // stripped props
        ctx.tag.props = props
        // add the event handlers so we can reference once the element is rendered
        // @ts-expect-error runtime hack
        ctx.tag._eventHandlers = eventHandlers
        // @ts-expect-error runtime hack
        ctx.tag._delayedSrc = delayedSrc
      },
      'dom:renderTag': function (ctx) {
        const $el = ctx.$el
        // @ts-expect-error runtime hack
        if (!ctx.tag._eventHandlers || !$el)
          return

        // while body does expose these events, they should be added to the window instead
        const $eventListenerTarget: Element | Window | null | undefined = ctx.tag.tag === 'bodyAttrs' && typeof window !== 'undefined' ? window : $el

        // @ts-expect-error runtime hack
        Object.entries(ctx.tag._eventHandlers).forEach(([k, value]) => {
          const sdeKey = `${ctx.tag._d || ctx.tag._p}:${k}`
          const eventName = k.slice(2).toLowerCase()
          const eventDedupeKey = `data-h-${eventName}`
          delete ctx.staleSideEffects[sdeKey]
          if ($el!.hasAttribute(eventDedupeKey))
            return

          const handler = value as EventListener
          // check if $el has the event listener
          $el!.setAttribute(eventDedupeKey, '')
          $eventListenerTarget!.addEventListener(eventName, handler)
          if (ctx.entry) {
            ctx.entry._sde[sdeKey] = () => {
              $eventListenerTarget!.removeEventListener(eventName, handler)
              $el!.removeAttribute(eventDedupeKey)
            }
          }
        })
        // only after the event listeners are added do we set the src
        // @ts-expect-error runtime hack
        if (ctx.tag._delayedSrc) {
          // @ts-expect-error runtime hack
          $el.setAttribute('src', ctx.tag._delayedSrc)
        }
      },
    },
  })
}
