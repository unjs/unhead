import type { CreateStreamableClientHeadOptions, UnheadStreamQueue } from 'unhead/stream/client'
import type { VueHeadClient } from '../types'
import { createStreamableHead as _createStreamableHead, DEFAULT_STREAM_KEY } from 'unhead/stream/client'
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

/**
 * Creates a client head by wrapping the core instance from the iife script.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createStreamableHead(options: CreateStreamableClientHeadOptions = {}): VueHeadClient | undefined {
  const head = _createStreamableHead({
    ...options,
    propResolvers: [VueResolver, ...(options.propResolvers || [])],
  }) as VueHeadClient | undefined
  if (head) {
    head.install = vueInstall(head)
  }
  return head
}

// Re-export everything from the base client module
export * from '../client'
// Export streaming-specific items only
export { type CreateStreamableClientHeadOptions, DEFAULT_STREAM_KEY, type UnheadStreamQueue }
export type { VueHeadClient }
