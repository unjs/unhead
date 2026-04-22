import type { WebStreamableHeadContext } from 'unhead/stream/server'
import type { CreateStreamableServerHeadOptions, ResolvableHead, SSRHeadPayload } from 'unhead/types'
import type { VueHeadClient } from '../types'
import {
  createStreamableHead as _createStreamableHead,
  wrapStream as coreWrapStream,
  renderSSRHeadSuspenseChunk,
} from 'unhead/stream/server'
import { defineComponent, h } from 'vue'
import { injectHead } from '../composables'
import { vueInstall } from '../install'
import { VueResolver } from '../resolver'

/**
 * Emits a `<script data-allow-mismatch="children">` whose `innerHTML` is the
 * pending head-update JS (if any). The client counterpart renders an identical
 * `<script data-allow-mismatch="children">` with empty innerHTML: symmetric
 * vnode types let Vue's hydrator match the node, and `data-allow-mismatch`
 * silences the inner-content difference.
 *
 * The Vite plugin injects one `<HeadStream />` at the top of every SFC
 * `<template>` that uses `useHead` / `useSeoMeta`.
 */
export const HeadStream = defineComponent({
  name: 'HeadStream',
  setup() {
    const head = injectHead()
    return () => {
      // Before `wrapStream` has captured the shell, entries belong to the
      // initial render and are serialized by the shell, not re-emitted into
      // the tree. Emit an empty placeholder so the client vnode tree stays in
      // sync.
      if (!(head as any)._shellRendered?.())
        return h('script', { 'data-allow-mismatch': 'children' })
      const update = renderSSRHeadSuspenseChunk(head)
      return h('script', { 'data-allow-mismatch': 'children', 'innerHTML': update || '' })
    }
  },
})

/**
 * Vue-specific context returned by createStreamableHead.
 * Extends WebStreamableHeadContext with Vue-specific head type.
 */
export interface VueStreamableHeadContext extends Omit<WebStreamableHeadContext<ResolvableHead>, 'head'> {
  /**
   * The Vue head instance to use with app.use(head)
   */
  head: VueHeadClient<any, SSRHeadPayload>
}

/**
 * Creates a head instance configured for Vue streaming SSR.
 *
 * @example
 * ```ts
 * export async function render(url: string, template: string) {
 *   const { app, router } = createApp()
 *   const { head, wrapStream } = createStreamableHead()
 *
 *   app.use(head)
 *   app.mixin(VueHeadMixin)
 *   router.push(url)
 *
 *   const vueStream = renderToWebStream(app)
 *   await router.isReady()
 *
 *   return wrapStream(vueStream, template)
 * }
 * ```
 */
export function createStreamableHead(
  options: Omit<CreateStreamableServerHeadOptions, 'propsResolver'> = {},
): VueStreamableHeadContext {
  const { head } = _createStreamableHead({
    ...options,
    propResolvers: [VueResolver],
  })
  const vueHead = head as VueHeadClient<any, SSRHeadPayload>
  vueHead.install = vueInstall(vueHead)

  // HeadStream flips from "empty placeholder" to "pending suspense-chunk JS"
  // once `wrapStream` has captured the shell state.
  let shellRendered = false
  ;(vueHead as any)._shellRendered = () => shellRendered

  return {
    head: vueHead,
    wrapStream: (stream: ReadableStream<Uint8Array>, template: string) => {
      const preRenderedState = vueHead.render()
      vueHead.entries.clear()
      shellRendered = true
      return coreWrapStream(vueHead, stream, template, preRenderedState)
    },
  }
}

// Export streaming-specific items only (not the re-exports from unhead/server)
export {
  createBootstrapScript,
  type CreateStreamableServerHeadOptions,
  prepareStreamingTemplate,
  renderShell,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  type StreamingTemplateParts,
  wrapStream,
} from 'unhead/stream/server'
export type { VueHeadClient }
