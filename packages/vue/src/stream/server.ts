import type { CreateStreamableServerHeadOptions } from 'unhead/types'
import type { VueHeadClient } from '../types'
import { createStreamableHead as _createStreamableHead, renderSSRHeadSuspenseChunk } from 'unhead/stream/server'
import { defineComponent, h } from 'vue'
import { injectHead } from '../composables'
import { vueInstall } from '../install'
import { VueResolver } from '../resolver'

// Re-export everything from the base server module
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
      const update = renderSSRHeadSuspenseChunk(head)
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

// Export streaming-specific items only (not the re-exports from unhead/server)
export {
  type CreateStreamableServerHeadOptions,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
} from 'unhead/stream/server'
export type { VueHeadClient }
