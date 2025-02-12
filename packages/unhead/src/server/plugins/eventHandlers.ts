import { defineHeadPlugin, hashCode, NetworkEvents } from '../../utils'

const ValidEventTags = new Set(['script', 'link', 'bodyAttrs'])

/**
 * Supports DOM event handlers (i.e `onload`) as functions.
 *
 * When SSR we need to strip out these values. On CSR we
 */
export const ServerEventHandlerPlugin = defineHeadPlugin({
  key: 'server-event-handler',
  hooks: {
    'tags:resolve': (ctx) => {
      for (const tag of ctx.tags) {
        if (!ValidEventTags.has(tag.tag)) {
          continue
        }

        const props = tag.props

        let hasEventHandlers = false
        for (const key in props) {
          // on
          if (key[0] !== 'o' || key[1] !== 'n') {
            continue
          }

          if (!Object.prototype.hasOwnProperty.call(props, key)) {
            continue
          }

          const value = props[key]

          if (typeof value !== 'function') {
            continue
          }

          // insert a inline script to set the status of onload and onerror
          if (NetworkEvents.has(key)) {
            props[key] = `this.dataset.${key}fired = true`
            hasEventHandlers = true
          }
        }

        if (hasEventHandlers && (tag.props.src || tag.props.href)) {
          tag.key = tag.key || hashCode(tag.props.src || tag.props.href)
        }
      }
    },
  },
})
