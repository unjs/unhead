import type { WebStreamableHeadContext } from 'unhead/stream/server'
import type { CreateStreamableServerHeadOptions } from 'unhead/types'
import { useContext } from 'solid-js'
import { ssr } from 'solid-js/web'
import {
  createStreamableHead as _createStreamableHead,
  wrapStream as coreWrapStream,
  renderSSRHeadSuspenseChunk,
} from 'unhead/stream/server'
import { UnheadContext } from '../context'

export { UnheadContext } from '../context'
export {
  prepareStreamingTemplate,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  type StreamingTemplateParts,
  type WebStreamableHeadContext,
  wrapStream,
} from 'unhead/stream/server'

/**
 * Solid-js streaming context returned by createStreamableHead.
 * Type alias for WebStreamableHeadContext from core.
 */
export type SolidStreamableHeadContext = WebStreamableHeadContext

/**
 * Creates a head instance configured for Solid-js streaming SSR.
 *
 * @example
 * ```tsx
 * const { head, wrapStream } = createStreamableHead()
 *
 * const stream = renderToStream(() => (
 *   <UnheadContext.Provider value={head}>
 *     <App />
 *   </UnheadContext.Provider>
 * ))
 *
 * return wrapStream(stream, template)
 * ```
 */
export function createStreamableHead(options: CreateStreamableServerHeadOptions = {}): SolidStreamableHeadContext {
  const { head } = _createStreamableHead(options)
  return {
    head,
    wrapStream: (stream: ReadableStream<Uint8Array>, template: string) =>
      coreWrapStream(head, stream, template),
  }
}

const scriptTemplate = ['<script>', '</script>'] as TemplateStringsArray & string[]

/**
 * Streaming script component - outputs inline script with current head state.
 * The Vite plugin with streaming: true auto-injects this.
 */
export function HeadStream() {
  const head = useContext(UnheadContext)
  if (!head)
    return null

  const update = renderSSRHeadSuspenseChunk(head)
  if (!update)
    return null

  return ssr(scriptTemplate, update)
}
