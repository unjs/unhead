import { defineHeadPlugin } from '@unhead/shared'
import type { RenderDomHeadOptions } from './renderDOMHead'
import { debouncedRenderDOMHead } from './debounced'

export interface TriggerDomPatchingOnUpdatesPluginOptions extends RenderDomHeadOptions {
  delayFn?: (fn: () => void) => void
}

/* @__NO_SIDE_EFFECTS__ */ export function PatchDomOnEntryUpdatesPlugin(options?: TriggerDomPatchingOnUpdatesPluginOptions) {
  return defineHeadPlugin({
    hooks: {
      'entries:updated': function (head) {
        // async load the renderDOMHead function
        debouncedRenderDOMHead(head, options)
      },
    },
  })
}
