import { defineHeadPlugin } from '@unhead/shared'
import type { RenderDomHeadOptions } from './renderDOMHead'
import { debouncedRenderDOMHead } from './renderDOMHead'

export interface TriggerDomPatchingOnUpdatesPluginOptions extends RenderDomHeadOptions {
  delayFn?: (fn: () => void) => void
}

export function PatchDomOnEntryUpdatesPlugin(options?: TriggerDomPatchingOnUpdatesPluginOptions) {
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
