import type { CreateClientHeadOptions, Head } from '../types'
import { createHeadCore } from '../createHead'
import { IsBrowser, NetworkEvents } from '../utils/const'
import { renderDOMHead } from './renderDOMHead'

export function createHead<T extends Record<string, any> = Head>(options: CreateClientHeadOptions = {}) {
  // restore initial entry from payload (titleTemplate and templateParams)
  const head = createHeadCore<T>({
    document: (IsBrowser ? document : undefined),
    ...options,
    propResolvers: [
      ...(options.propResolvers || []),
      (k, v, tag) => {
        if (tag && k.substring(0, 2) === 'on' && typeof v === 'function') {
          tag._eventHandlers = tag._eventHandlers || {}
          tag._eventHandlers![k] = v
          return null
        }
      },
    ],
  })
  // restore initial entry from payload (titleTemplate and templateParams)
  const initialPayload = head.resolvedOptions.document?.head.querySelector('script[id="unhead:payload"]')?.innerHTML || false
  if (initialPayload) {
    head.push(JSON.parse(initialPayload))
  }
  const render = options.domOptions?.render || renderDOMHead
  head.use({
    key: 'client',
    hooks: {
      'entries:updated': (head) => {
        // async load the renderDOMHead function
        render(head)
      },
      'dom:renderTag': ({ $el, tag }) => {
        const dataset = ($el as HTMLScriptElement | undefined)?.dataset

        if (!dataset) {
          return
        }

        // this is only handling SSR rendered tags with event handlers
        for (const k in dataset) {
          if (!k.endsWith('fired')) {
            continue
          }

          // onloadfired -> onload
          const ek = k.slice(0, -5)

          if (!NetworkEvents.has(ek)) {
            continue
          }

          // onload -> load
          tag._eventHandlers?.[ek]?.call($el, new Event(ek.substring(2)))
        }
      },
    },
  })
  return head
}
