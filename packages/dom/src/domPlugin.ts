import type { RenderDomHeadOptions } from './renderDOMHead'
import { defineHeadPlugin } from '@unhead/shared'
import { debouncedRenderDOMHead } from './debounced'

export interface DomPluginOptions extends RenderDomHeadOptions {
  delayFn?: (fn: () => void) => void
}

/* @__NO_SIDE_EFFECTS__ */ export function DomPlugin(options?: DomPluginOptions) {
  return defineHeadPlugin((head) => {
    // restore initial entry from payload (titleTemplate and templateParams)
    const initialPayload = head.resolvedOptions.document?.head.querySelector('script[id="unhead:payload"]')?.innerHTML || false
    if (initialPayload) {
      head.push(JSON.parse(initialPayload))
    }
    return {
      mode: 'client',
      hooks: {
        'entries:updated': (head) => {
          // async load the renderDOMHead function
          debouncedRenderDOMHead(head, options)
        },
      },
    }
  })
}
