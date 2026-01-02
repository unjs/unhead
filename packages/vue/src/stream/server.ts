import type { WebStreamableHeadContext } from 'unhead/stream/server'
import type { CreateStreamableServerHeadOptions, ResolvableHead } from 'unhead/types'
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

/**
 * Vue-specific context returned by createStreamableHead.
 * Extends WebStreamableHeadContext with Vue-specific head type.
 */
export interface VueStreamableHeadContext extends Omit<WebStreamableHeadContext<ResolvableHead>, 'head'> {
  /**
   * The Vue head instance to use with app.use(head)
   */
  head: VueHeadClient
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
 *   // Create stream first - Vue starts rendering synchronously
 *   const vueStream = renderToWebStream(app)
 *
 *   // Wait for router - by now Vue's sync render has pushed head entries
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
  const vueHead = head as VueHeadClient
  vueHead.install = vueInstall(vueHead)

  return {
    head: vueHead,
    wrapStream: (stream: ReadableStream<Uint8Array>, template: string) =>
      coreWrapStream(vueHead, stream, template),
  }
}

// Export streaming-specific items only (not the re-exports from unhead/server)
export {
  type CreateStreamableServerHeadOptions,
  prepareStreamingTemplate,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  type StreamingTemplateParts,
  wrapStream,
} from 'unhead/stream/server'
export type { VueHeadClient }
