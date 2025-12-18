import type { CreateServerHeadOptions, CreateStreamableServerHeadOptions } from 'unhead/types'
import type { VueHeadClient } from './types'
import { createHead as _createServerHead } from 'unhead/server'
import { createStreamableHead as _createStreamableHead, STREAM_MARKER } from 'unhead/stream/server'
import { defineComponent, h } from 'vue'
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
