import type { CreateStreamableClientHeadOptions } from 'unhead/types'
import type { VueHeadClient } from '../types'
import { createDebouncedFn, renderDOMHead } from 'unhead/client'
import { createStreamableHead as _createStreamableHead } from 'unhead/stream/client'
import { defineComponent, nextTick } from 'vue'
import { vueInstall } from '../install'
import { VueResolver } from '../resolver'

export function createStreamableHead(options: CreateStreamableClientHeadOptions = {}): VueHeadClient {
  const { streamKey, ...rest } = options
  const head = _createStreamableHead({
    ...rest,
    streamKey,
    propResolvers: [VueResolver],
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), nextTick),
    },
  }) as unknown as VueHeadClient
  head.install = vueInstall(head)
  return head
}

/**
 * Client-side HeadStream - renders nothing since head updates are applied via window.__unhead__
 */
export const HeadStream = defineComponent({
  name: 'HeadStream',
  setup() {
    return () => null
  },
})

export type {
  CreateStreamableClientHeadOptions,
  VueHeadClient,
}
