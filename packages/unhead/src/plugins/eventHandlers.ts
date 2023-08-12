import type { HeadTag } from '@unhead/schema'
import { defineHeadPlugin } from '@unhead/shared'

const ValidEventTags = ['script', 'link', 'bodyAttrs']

function stripEventHandlers(tag: HeadTag) {
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

/**
 * Supports DOM event handlers (i.e `onload`) as functions.
 *
 * When SSR we need to strip out these values. On CSR we
 */
export default defineHeadPlugin({
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
        tag.props = stripEventHandlers(tag).props
        return tag
      })
    },
    'tags:resolve': function (ctx) {
      // strip event handlers
      ctx.tags = ctx.tags.map((tag) => {
        // must be a valid tag
        if (!ValidEventTags.includes(tag.tag))
          return tag
        const { props, eventHandlers } = stripEventHandlers(tag)
        if (Object.keys(eventHandlers).length) {
          tag.props = props
          tag._eventHandlers = eventHandlers
        }
        return tag
      })
    },
    'dom:renderTag': function (ctx, dom) {
      if (!ctx.tag._eventHandlers)
        return

      const $eventListenerTarget: Element | Window | null | undefined = ctx.tag.tag === 'bodyAttrs' ? dom.defaultView : ctx.$el
      // @ts-expect-error runtime hack
      Object.entries(ctx.tag._eventHandlers).forEach(([k, value]) => {
        const sdeKey = `${ctx.tag._d || ctx.tag._p}:${k}`
        const eventName = k.slice(2).toLowerCase()
        const eventDedupeKey = `data-h-${eventName}`
        ctx.markSideEffect(sdeKey, () => {})
        if (ctx.$el!.hasAttribute(eventDedupeKey))
          return

        const handler = value as EventListener
        // check if $el has the event listener
        ctx.$el!.setAttribute(eventDedupeKey, '')
        $eventListenerTarget!.addEventListener(eventName, handler)
        if (ctx.entry) {
          ctx.markSideEffect(sdeKey, () => {
            $eventListenerTarget!.removeEventListener(eventName, handler)
            ctx.$el!.removeAttribute(eventDedupeKey)
          })
        }
      })
    },
  },
})
