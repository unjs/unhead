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
 * Vue emits resolved Suspense boundaries in document order.
 * `wrapStream()` can therefore write each head patch after its app chunk.
 * React and Solid use `<HeadStream />` for out-of-order reveals.
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
    // Use the core chunk renderer.
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
  renderStreamBodyTags,
  renderStreamEnd,
  type StreamingTemplateParts,
  wrapStream,
} from 'unhead/stream/server'
export type { VueHeadClient }
