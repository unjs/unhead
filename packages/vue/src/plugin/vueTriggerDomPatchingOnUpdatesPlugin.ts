import { defineHeadPlugin } from 'unhead'
import type { RenderDomHeadOptions } from '@unhead/dom'
import { debouncedRenderDOMHead } from '@unhead/dom'
import { nextTick } from 'vue'

export const VueTriggerDomPatchingOnUpdatesPlugin = (options?: RenderDomHeadOptions) => {
  return defineHeadPlugin({
    hooks: {
      'entries:updated': function (head) {
        debouncedRenderDOMHead(nextTick, head, { document: options?.document })
      },
    },
  })
}
