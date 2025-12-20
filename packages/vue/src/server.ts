import type { CreateServerHeadOptions, CreateStreamableServerHeadOptions } from 'unhead/types'
import type { VueHeadClient } from './types'
import { createHead as _createServerHead } from 'unhead/server'
import { createStreamableHead as _createStreamableHead, renderSSRHeadSuspenseChunkSync } from 'unhead/stream/server'
import { defineComponent, h } from 'vue'
import { injectHead } from './composables'
import { vueInstall } from './install'
import { VueResolver } from './resolver'

export { VueHeadMixin } from './VueHeadMixin'
export { extractUnheadInputFromHtml, propsToString, renderSSRHead, type SSRHeadPayload, transformHtmlTemplate } from 'unhead/server'
// Experimental streaming support
export {
  renderSSRHeadClosing,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  streamWithHead,
} from 'unhead/stream/server'

/**
 * Streaming script component - outputs inline script with current head state.
 * Use this in components that call useHead() to stream head updates immediately.
 * The Vite plugin with streaming: true auto-injects this.
 */
export const HeadStreamScript = defineComponent({
  name: 'HeadStreamScript',
  setup() {
    const head = injectHead()
    return () => {
      const update = renderSSRHeadSuspenseChunkSync(head)
      if (!update)
        return null
      return h('script', { innerHTML: update })
    }
  },
})

/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: Omit<CreateServerHeadOptions, 'propsResolver'> = {}): VueHeadClient {
  const head = _createServerHead({
    ...options,
    propResolvers: [VueResolver],
  }) as VueHeadClient
  head.install = vueInstall(head)
  return head
}

export function createStreamableHead(options: Omit<CreateStreamableServerHeadOptions, 'propsResolver'> = {}): VueHeadClient {
  const head = _createStreamableHead({
    ...options,
    propResolvers: [VueResolver],
  }) as VueHeadClient
  head.install = vueInstall(head)
  return head
}

export type {
  CreateServerHeadOptions,
  CreateStreamableServerHeadOptions,
  VueHeadClient,
}
