import type { HeadTag } from '@unhead/schema'
import { NetworkEvents, defineHeadPlugin, hashCode } from '@unhead/shared'

const ValidEventTags = ['script', 'link', 'bodyAttrs']

function stripEventHandlers(tag: HeadTag) {
  const props: HeadTag['props'] = {}
  const eventHandlers: Record<string, (e: Event) => {}> = {}
  Object.entries(tag.props)
    .forEach(([key, value]) => {
      if (key.startsWith('on') && typeof value === 'function') {
        // insert a inline script to set the status of onload and onerror
        if (NetworkEvents.includes(key))
          props[key] = `this.dataset.${key} = true`
        eventHandlers[key] = value
      }
      else { props[key] = value }
    })
  return { props, eventHandlers }
}

/**
 * Supports DOM event handlers (i.e `onload`) as functions.
 *
 * When SSR we need to strip out these values. On CSR we
 */
export default defineHeadPlugin(head => ({
  hooks: {
    'tags:resolve': function (ctx) {
      for (const tag of ctx.tags) {
        // must be a valid tag
        if (ValidEventTags.includes(tag.tag)) {
          const { props, eventHandlers } = stripEventHandlers(tag)
          tag.props = props
          if (Object.keys(eventHandlers).length) {
            // need a key
            if (tag.props.src || tag.props.href)
              tag.key = tag.key || hashCode(tag.props.src || tag.props.href)
            tag._eventHandlers = eventHandlers
          }
        }
      }
    },
    'dom:renderTag': function (ctx, dom, track) {
      if (!ctx.tag._eventHandlers)
        return

      const $eventListenerTarget: Element | Window | null | undefined = ctx.tag.tag === 'bodyAttrs' ? dom.defaultView : ctx.$el
      Object.entries(ctx.tag._eventHandlers).forEach(([k, value]) => {
        const sdeKey = `${ctx.tag._d || ctx.tag._p}:${k}`
        const eventName = k.slice(2).toLowerCase()
        const eventDedupeKey = `data-h-${eventName}`
        track(ctx.id, sdeKey, () => {})
        if (ctx.$el!.hasAttribute(eventDedupeKey))
          return

        ctx.$el!.setAttribute(eventDedupeKey, '')

        let observer: MutationObserver
        const handler = (e: Event) => {
          value(e)
          observer?.disconnect()
        }
        if (k in ctx.$el.dataset) {
          handler(new Event(k.replace('on', '')))
        }
        else if (NetworkEvents.includes(k) && typeof MutationObserver !== 'undefined') {
          observer = new MutationObserver((e) => {
            const hasAttr = e.some(m => m.attributeName === `data-${k}`)
            if (hasAttr) {
              handler(new Event(k.replace('on', '')))
              observer?.disconnect()
            }
          })
          observer.observe(ctx.$el, {
            attributes: true,
          })
        }
        else {
          // check if $el has the event listener
          $eventListenerTarget!.addEventListener(eventName, handler)
        }
        track(ctx.id, sdeKey, () => {
          observer?.disconnect()
          $eventListenerTarget!.removeEventListener(eventName, handler)
          ctx.$el!.removeAttribute(eventDedupeKey)
        })
      })
    },
  },
}))
