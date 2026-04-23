import type { WebStreamableHeadContext } from 'unhead/stream/server'
import type { CreateStreamableServerHeadOptions, ResolvableHead, SSRHeadPayload } from 'unhead/types'
import type { VueHeadClient } from '../types'
import {
  createStreamableHead as _createStreamableHead,
  prepareStreamingTemplate,
  renderSSRHeadSuspenseChunk,
} from 'unhead/stream/server'
import { vueInstall } from '../install'
import { VueResolver } from '../resolver'

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
 * `wrapStream` is Vue-specific: Vue's `renderToWebStream` flushes chunks in
 * document order per resolved Suspense boundary, so any head entries added
 * during a chunk's render can be emitted as a self-deleting inline
 * `<script>` right after the chunk. The script executes at HTML parse
 * (updating the client head state progressively) and calls
 * `document.currentScript.remove()` so the DOM is clean before Vue
 * hydrates. This pattern is not safe for frameworks with out-of-order
 * Suspense reveals (React, Solid) or framework-specific chunk formats
 * (Svelte) — those continue to use an in-tree `<HeadStream />` component
 * whose output is serialized inside the framework's own stream.
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

  const encoder = new TextEncoder()

  const flushPatch = (controller: ReadableStreamDefaultController<Uint8Array>) => {
    const patch = renderSSRHeadSuspenseChunk(vueHead)
    if (patch)
      controller.enqueue(encoder.encode(`<script>${patch};document.currentScript.remove()</script>`))
  }

  return {
    head: vueHead,
    wrapStream: (stream, template) =>
      new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            const { shell, end } = prepareStreamingTemplate(vueHead, template)
            controller.enqueue(encoder.encode(shell))

            const reader = stream.getReader()
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done)
                  break
                controller.enqueue(value)
                flushPatch(controller)
              }
            }
            finally {
              reader.releaseLock()
            }

            flushPatch(controller)
            controller.enqueue(encoder.encode(end))
            controller.close()
          }
          catch (error) {
            controller.error(error)
          }
        },
      }),
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
