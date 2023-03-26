import { defineHeadPlugin } from '@unhead/shared'
import type { DebouncedRenderDomHeadOptions } from '@unhead/dom'
import { debouncedRenderDOMHead } from '@unhead/dom'

export const PatchDomOnEntryUpdatesPlugin = (options?: DebouncedRenderDomHeadOptions) => {
  return defineHeadPlugin({
    hooks: {
      'entries:updated': function (head) {
        // only if we have a document, avoid unhead/dom in ssr
        if (typeof options?.document === 'undefined' && typeof window === 'undefined')
          return
        let delayFn = options?.delayFn
        if (!delayFn && typeof requestAnimationFrame !== 'undefined')
          delayFn = requestAnimationFrame

        // async load the renderDOMHead function
        debouncedRenderDOMHead(head, { document: options?.document || window.document, delayFn })
      },
    },
  })
}
