import type { WebStreamableHeadContext } from 'unhead/stream/server'
import type { CreateStreamableServerHeadOptions, ResolvableHead, SSRHeadPayload } from 'unhead/types'
import type { VueHeadClient } from '../types'
import {
  createStreamableHead as _createStreamableHead,
  wrapStream,
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
 * `wrapStream` suits Vue because `renderToWebStream` flushes chunks in
 * document order per resolved Suspense boundary, so head entries added during
 * a chunk's render can be emitted as a self-deleting inline `<script>` right
 * after the chunk. The script executes at HTML parse (updating the client head
 * state progressively) and calls `document.currentScript.remove()` so the DOM
 * is clean before Vue hydrates. Frameworks with out-of-order Suspense reveals
 * (React, Solid) place that script in the tree with `<HeadStream />` instead,
 * so it lands inside the framework's own chunk format.
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
  options: Omit<CreateStreamableServerHeadOptions, 'propResolvers'> = {},
): VueStreamableHeadContext {
  const { head } = _createStreamableHead({
    ...options,
    propResolvers: [VueResolver],
  })
  const vueHead = head as VueHeadClient<any, SSRHeadPayload>
  vueHead.install = vueInstall(vueHead)

  return {
    head: vueHead,
    // No `flushChunk`: a second copy of the core default only drifts from it.
    wrapStream: (stream, template) => wrapStream(vueHead, stream, template),
  }
}

// Export streaming-specific items only (not the re-exports from unhead/server)
export {
  createBootstrapScript,
  type CreateStreamableServerHeadOptions,
  type PreparedTemplate,
  prepareStreamingTemplate,
  prepareTemplate,
  renderShell,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  renderStreamEnd,
  renderStreamMarkup,
  type StreamedTagsReport,
  type StreamingTemplateParts,
  wrapStream,
} from 'unhead/stream/server'
export type { VueHeadClient }
