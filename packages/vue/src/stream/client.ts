import type { CreateStreamableClientHeadOptions, UnheadStreamQueue } from 'unhead/stream/client'
import type { UseHeadInput, VueHeadClient } from '../types'
import { createStreamableHead as _createStreamableHead } from 'unhead/stream/client'
import { defineComponent, h } from 'vue'
import { vueInstall } from '../install'
import { VueResolver } from '../resolver'
import { VueHeadMixin } from '../VueHeadMixin'

/**
 * Client-side counterpart to the server `HeadStream`. Always emits a
 * `<script data-allow-mismatch="children">` with empty `innerHTML`. The
 * matching vnode type on both sides lets Vue hydrate the node; the
 * `data-allow-mismatch` attribute silences the inner-content difference
 * between the server-emitted streaming patch and this empty client vnode.
 *
 * The already-executed server script stays in the DOM after hydration — it's
 * inert (scripts only execute on parse) and the placeholder is cheap.
 */
export const HeadStream = defineComponent({
  name: 'HeadStream',
  setup() {
    return () => h('script', { 'data-allow-mismatch': 'children' })
  },
})

/**
 * Creates a client head by wrapping the core instance from the iife script.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createStreamableHead(options: CreateStreamableClientHeadOptions = {}): VueHeadClient<UseHeadInput, boolean> | undefined {
  const head = _createStreamableHead({
    ...options,
    propResolvers: [VueResolver, ...(options.propResolvers || [])],
  }) as VueHeadClient<UseHeadInput, boolean> | undefined
  if (head) {
    head.install = vueInstall(head)
  }
  return head
}

export { VueHeadMixin }
export type { CreateStreamableClientHeadOptions, UnheadStreamQueue, VueHeadClient }
