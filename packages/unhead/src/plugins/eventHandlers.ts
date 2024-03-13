import { NetworkEvents, defineHeadPlugin, hashCode } from '@unhead/shared'

const ValidEventTags = ['script', 'link', 'bodyAttrs']

/**
 * Supports DOM event handlers (i.e `onload`) as functions.
 *
 * When SSR we need to strip out these values. On CSR we
 */
export default defineHeadPlugin(head => ({
  hooks: {
    'tags:resolve': function (ctx) {
      for (const tag of ctx.tags.filter(t => ValidEventTags.includes(t.tag))) {
        // must be a valid tag
        Object.entries(tag.props)
          .forEach(([key, value]) => {
            if (key.startsWith('on') && typeof value === 'function') {
              // insert a inline script to set the status of onload and onerror
              if (head.ssr && NetworkEvents.includes(key)) {
                tag.props[key] = `this.dataset.${key} = true`
                tag.props['data-unhead-events'] = ''
              }
              else { delete tag.props[key] }
              tag._eventHandlers = tag._eventHandlers || {}
              tag._eventHandlers![key] = value
            }
          })
        if (head.ssr && tag._eventHandlers && (tag.props.src || tag.props.href)) {
          tag.key = tag.key || hashCode(tag.props.src || tag.props.href)
        }
      }
    },
    'dom:renderTag': function (ctx) {
      // this is only handling SSR rendered tags with event handlers
      const $el = ctx.$el as HTMLScriptElement
      if (!$el?.dataset || !('unheadEvents' in $el.dataset))
        return
      delete $el.dataset.unheadEvents
      const handler = (k: string) => ctx.tag._eventHandlers?.[k]?.call(ctx.$el, new Event(k.replace('on', '')))
      for (const k of Object.keys($el.dataset).filter(k => NetworkEvents.includes(k)))
        handler(k)
      if (typeof MutationObserver !== 'undefined') {
        // we need to handle SSR events, as they are not triggered
        const observer = new MutationObserver((e) => {
          e.filter(m => m.attributeName && NetworkEvents.includes(m.attributeName!.replace('data-', '')))
            .map(m => m.attributeName!.replace('data-', ''))
            .map(handler)
        })
        observer.observe(ctx.$el, { attributes: true })
      }
    },
  },
}))
