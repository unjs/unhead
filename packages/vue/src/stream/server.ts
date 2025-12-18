import type { CreateStreamableServerHeadOptions } from 'unhead/types'
import type { VueHeadClient } from '../types'
import { createStreamableHead as _createStreamableHead, STREAM_MARKER } from 'unhead/stream/server'
import { defineComponent, h } from 'vue'
import { vueInstall } from '../install'
import { VueResolver } from '../resolver'

export {
  renderSSRHeadClosing,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  streamWithHead,
} from 'unhead/stream/server'

export function createStreamableHead(options: Omit<CreateStreamableServerHeadOptions, 'propsResolver'> = {}): VueHeadClient {
  const head = _createStreamableHead({
    ...options,
    propResolvers: [VueResolver],
  }) as VueHeadClient
  head.install = vueInstall(head)
  return head
}

/**
 * Streaming head component for Vue.
 * Renders a marker that triggers head updates during streaming SSR.
 * Place this after async components that call useHead/useServerHead.
 */
export const HeadStream = defineComponent({
  name: 'HeadStream',
  setup() {
    return () => h('script', null, STREAM_MARKER)
  },
})

export type {
  CreateStreamableServerHeadOptions,
  VueHeadClient,
}
