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
 * Streaming script component - outputs inline script with current head state.
 * The Vite plugin with streaming: true auto-injects this.
 */
export const HeadStream = defineComponent({
  name: 'HeadStream',
  setup() {
    const head = injectHead()
    return () => {
      // Skip if shell hasn't been rendered yet - entries will be captured in shell
      if (!(head as any)._shellRendered?.())
        return null
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

  // Track shell render state - HeadStream skips entries until shell is rendered
  let shellRendered = false
  ;(vueHead as any)._shellRendered = () => shellRendered

  return {
    head: vueHead,
    wrapStream: (stream: ReadableStream<Uint8Array>, template: string) => {
      // Capture shell state before clearing entries
      const preRenderedState = vueHead.render() as SSRHeadPayload
      vueHead.entries.clear()
      // Mark shell as rendered so HeadStream starts outputting streaming updates
      shellRendered = true
      return coreWrapStream(vueHead, stream, template, preRenderedState)
    },
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
