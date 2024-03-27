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
              if (head.ssr && NetworkEvents.includes(key))
                tag.props[key] = `this.dataset.${key}fired = true`

              else delete tag.props[key]
              tag._eventHandlers = tag._eventHandlers || {}
              tag._eventHandlers![key] = value
            }
          })
        if (head.ssr && tag._eventHandlers && (tag.props.src || tag.props.href))
          tag.key = tag.key || hashCode(tag.props.src || tag.props.href)
      }
    },
    'dom:renderTag': function ({ $el, tag }) {
      // this is only handling SSR rendered tags with event handlers
      for (const k of Object.keys($el?.dataset as HTMLScriptElement || {}).filter(k => NetworkEvents.some(e => `${e}fired` === k))) {
        const ek = k.replace('fired', '')
        tag._eventHandlers?.[ek]?.call($el, new Event(ek.replace('on', '')))
      }
    },
  },
}))
