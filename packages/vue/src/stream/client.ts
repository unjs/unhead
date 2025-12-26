import type { VueHeadClient } from '../types'
import { createStreamableHead as _createStreamableHead } from 'unhead/stream/client'
import { defineComponent } from 'vue'
import { vueInstall } from '../install'
import { VueResolver } from '../resolver'

/**
 * Client-side HeadStream - renders nothing (script already executed during SSR streaming)
 */
export const HeadStream = defineComponent({
  name: 'HeadStream',
  setup() {
    return () => null
  },
})

/* @__NO_SIDE_EFFECTS__ */
export function createStreamableHead(options: Parameters<typeof _createStreamableHead>[0] = {}): VueHeadClient {
  const head = _createStreamableHead({
    ...options,
    propResolvers: [VueResolver, ...(options.propResolvers || [])],
  }) as VueHeadClient
  head.install = vueInstall(head)
  return head
}

// Re-export everything from the base client module
export * from '../client'
// Export streaming-specific items only (not the re-exports from unhead/client)
export {
  type CreateStreamableClientHeadOptions,
  DEFAULT_STREAM_KEY,
  type UnheadStreamQueue,
} from 'unhead/stream/client'
export type { VueHeadClient }
