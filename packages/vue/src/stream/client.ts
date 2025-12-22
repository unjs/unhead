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

export * from '../client'
export * from 'unhead/stream/client'
export type { VueHeadClient }
