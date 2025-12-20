import type { CreateStreamableServerHeadOptions } from 'unhead/types'
import type { VueHeadClient } from '../types'
import { createStreamableHead as _createStreamableHead, renderSSRHeadSuspenseChunkSync } from 'unhead/stream/server'
import { defineComponent, h } from 'vue'
import { injectHead } from '../composables'
import { vueInstall } from '../install'
import { VueResolver } from '../resolver'

export * from '../server'

/**
 * Streaming script component - outputs inline script with current head state.
 * The Vite plugin with streaming: true auto-injects this.
 */
export const HeadStream = defineComponent({
  name: 'HeadStream',
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

export function createStreamableHead(options: Omit<CreateStreamableServerHeadOptions, 'propsResolver'> = {}): VueHeadClient {
  const head = _createStreamableHead({
    ...options,
    propResolvers: [VueResolver],
  }) as VueHeadClient
  head.install = vueInstall(head)
  return head
}

export type {
  CreateStreamableServerHeadOptions,
  VueHeadClient,
}

export {
  renderSSRHeadClosing,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  streamWithHead,
} from 'unhead/stream/server'
