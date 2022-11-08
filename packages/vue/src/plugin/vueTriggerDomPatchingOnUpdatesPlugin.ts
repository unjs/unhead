import { defineHeadPlugin } from 'unhead'
import { debouncedRenderDOMHead } from '@unhead/dom'
import { nextTick } from 'vue'

export const VueTriggerDomPatchingOnUpdatesPlugin = () => {
  return defineHeadPlugin({
    hooks: {
      'entries:updated': function (head) {
        debouncedRenderDOMHead(nextTick, head)
      },
    },
  })
}
