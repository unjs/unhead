import type { HeadTag } from '@unhead/schema'
import { defineHeadPlugin } from '..'

/**
 * Supports DOM event handlers (i.e `onload`) as functions.
 *
 * When SSR we need to strip out these values. On CSR we
 */
export const EventHandlersPlugin = () => {
  const stripEventHandlers = (tag: HeadTag) => {
    const props: HeadTag['props'] = {}
    const eventHandlers: HeadTag['props'] = {}
    Object.entries(tag.props)
      .forEach(([key, value]) => {
        if (key.startsWith('on') && typeof value === 'function')
          eventHandlers[key] = value
        else
          props[key] = value
      })
    return { props, eventHandlers }
  }

  return defineHeadPlugin({
    hooks: {
      'ssr:beforeRender': function (ctx) {
        // when server-side rendering we need to strip out all event handlers that are functions
        ctx.tags = ctx.tags.map((tag) => {
          tag.props = stripEventHandlers(tag).props
          return tag
        })
      },
      'dom:beforeRenderTag': function (ctx) {
        // we need to strip out all event handlers that are functions and add them on to the tag
        const { props, eventHandlers } = stripEventHandlers(ctx.tag)
        if (!Object.keys(eventHandlers).length)
          return

        // stripped props
        ctx.tag.props = props
        // add the event handlers so we can reference once the element is rendered
        // @ts-expect-error runtime hack
        ctx.tag._eventHandlers = eventHandlers
      },
      'dom:renderTag': function (ctx) {
        const $el = ctx.$el
        // @ts-expect-error runtime hack
        if (!ctx.tag._eventHandlers || !$el)
          return

        // @ts-expect-error runtime hack
        Object.entries(ctx.tag._eventHandlers).forEach(([k, value]) => {
          const sdeKey = `${ctx.tag._d || ctx.tag._p}:${k}`

          const eventName = k.slice(2).toLowerCase()
          const handler = value as EventListener
          $el?.addEventListener(eventName, handler)
          ctx.entry._sde[sdeKey] = () => {
            $el.removeEventListener(eventName, handler)
          }
          delete ctx.queuedSideEffects[sdeKey]
        })
      },
    },
  })
}
