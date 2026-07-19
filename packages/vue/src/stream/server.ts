import type { WebStreamableHeadContext } from 'unhead/stream/server'
import type { CreateStreamableServerHeadOptions as CoreCreateStreamableServerHeadOptions, SSRHeadPayload } from 'unhead/types'
import type { UseHeadInput, VueHeadClient } from '../types'
import {
  createStreamableHead as _createStreamableHead,
  renderSSRHeadSuspenseChunk,
  wrapStream,
} from 'unhead/stream/server'
import { vueInstall } from '../install'
import { VueResolver } from '../resolver'

/**
 * Vue-specific context returned by createStreamableHead.
 * Extends WebStreamableHeadContext with Vue-specific head type.
 */
export interface VueStreamableHeadContext<I extends UseHeadInput = UseHeadInput> extends Omit<WebStreamableHeadContext<I>, 'head'> {
  /**
   * The Vue head instance to use with app.use(head)
   */
  head: VueHeadClient<I, SSRHeadPayload>
}

export type CreateStreamableServerHeadOptions<I extends UseHeadInput = UseHeadInput> = Omit<CoreCreateStreamableServerHeadOptions<I>, 'propResolvers'>
type CreateStreamableHeadArgs<Input extends UseHeadInput> = UseHeadInput extends Input
  ? [options?: CreateStreamableServerHeadOptions<Input>]
  : [options: CreateStreamableServerHeadOptions<Input> & { disableDefaults: true }]

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
export function createStreamableHead(options?: CreateStreamableServerHeadOptions<UseHeadInput>): VueStreamableHeadContext<UseHeadInput>
export function createStreamableHead<I extends UseHeadInput>(options: CreateStreamableServerHeadOptions<I> & { disableDefaults: true }): VueStreamableHeadContext<I>
export function createStreamableHead<I extends UseHeadInput>(options: CreateStreamableServerHeadOptions<I>): VueStreamableHeadContext<I | UseHeadInput>
export function createStreamableHead<I extends UseHeadInput = UseHeadInput>(...args: CreateStreamableHeadArgs<I>): VueStreamableHeadContext<I>
export function createStreamableHead<I extends UseHeadInput = UseHeadInput>(
  options: CreateStreamableServerHeadOptions<I> = {},
): VueStreamableHeadContext<I> {
  const { head } = _createStreamableHead<I>({
    ...options,
    propResolvers: [VueResolver],
  } as CoreCreateStreamableServerHeadOptions<I> & { disableDefaults: true })
  const vueHead = head as VueHeadClient<I, SSRHeadPayload>
  vueHead.install = vueInstall(vueHead)

  const flushPatch = () => {
    const patch = renderSSRHeadSuspenseChunk(vueHead)
    return patch ? `<script>${patch};document.currentScript.remove()</script>` : ''
  }

  return {
    head: vueHead,
    wrapStream: (stream, template) =>
      wrapStream(vueHead, stream, template, undefined, { flushChunk: flushPatch }),
  }
}

// Export streaming-specific items only (not the re-exports from unhead/server)
export {
  createBootstrapScript,
  type PreparedTemplate,
  prepareStreamingTemplate,
  prepareTemplate,
  renderShell,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  type StreamingTemplateParts,
  wrapStream,
} from 'unhead/stream/server'
export type { VueHeadClient }
