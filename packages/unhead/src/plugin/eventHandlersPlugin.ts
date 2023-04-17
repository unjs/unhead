import type { HeadTag } from '@unhead/schema'
import { defineHeadPlugin } from '@unhead/shared'

const ValidEventTags = ['script', 'link', 'bodyAttrs']

/**
 * Supports DOM event handlers (i.e `onload`) as functions.
 *
 * When SSR we need to strip out these values. On CSR we
 */
export function EventHandlersPlugin() {
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
          // must be a valid tag
          if (!ValidEventTags.includes(tag.tag))
            return tag
          // must have events
          if (!Object.entries(tag.props).find(([key, value]) => key.startsWith('on') && typeof value === 'function'))
            return tag
          tag.props = stripEventHandlers('ssr', tag).props
          return tag
        })
      },
      'dom:beforeRenderTag': function (ctx) {
        if (!ValidEventTags.includes(ctx.tag.tag))
          return
        // must have events
        if (!Object.entries(ctx.tag.props).find(([key, value]) => key.startsWith('on') && typeof value === 'function'))
          return
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
        const $eventListenerTarget: Element | Window | null | undefined = (ctx.tag.tag === 'bodyAttrs' && typeof window !== 'undefined') ? window : $el

        // @ts-expect-error runtime hack
        Object.entries(ctx.tag._eventHandlers).forEach(([k, value]) => {
          const sdeKey = `${ctx.tag._d || ctx.tag._p}:${k}`
          const eventName = k.slice(2).toLowerCase()
          const eventDedupeKey = `data-h-${eventName}`
          ctx.markSideEffect(sdeKey, () => {})
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
