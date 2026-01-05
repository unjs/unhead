import type { CreateStreamableClientHeadOptions, UnheadStreamQueue } from 'unhead/stream/client'
import type { VueHeadClient } from '../types'
import { createStreamableHead as _createStreamableHead } from 'unhead/stream/client'
import { defineComponent } from 'vue'
import { vueInstall } from '../install'
import { VueResolver } from '../resolver'
import { VueHeadMixin } from '../VueHeadMixin'

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

export { VueHeadMixin }
export type { CreateStreamableClientHeadOptions, UnheadStreamQueue, VueHeadClient }
