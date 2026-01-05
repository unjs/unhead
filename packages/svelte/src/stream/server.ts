import type { WebStreamableHeadContext } from 'unhead/stream/server'
import type { CreateStreamableServerHeadOptions, SSRHeadPayload, Unhead } from 'unhead/types'
import { getContext } from 'svelte'
import {
  createStreamableHead as _createStreamableHead,
  wrapStream as coreWrapStream,
  renderSSRHeadSuspenseChunk,
} from 'unhead/stream/server'
import { UnheadContextKey } from '../context'

export { UnheadContextKey } from '../context'

export {
  type CreateStreamableServerHeadOptions,
  prepareStreamingTemplate,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  type StreamingTemplateParts,
  type WebStreamableHeadContext,
  wrapStream,
} from 'unhead/stream/server'

/**
 * Streaming script function for Svelte.
 * Returns HTML string to be rendered with {@html}.
 * The Vite plugin with streaming: true auto-injects this.
 */
export function HeadStream(): string {
  const head = getContext<Unhead | null>(UnheadContextKey)
  if (!head)
    return ''

  // Skip if shell hasn't been rendered yet - entries will be captured in shell
  if (!(head as any)._shellRendered?.())
    return ''

  const update = renderSSRHeadSuspenseChunk(head)
  if (!update)
    return ''

  return `<script>${update}</script>`
}

/**
 * Svelte streaming context returned by createStreamableHead.
 * Type alias for WebStreamableHeadContext from core.
 */
export type SvelteStreamableHeadContext = WebStreamableHeadContext

/**
 * Creates a head instance configured for Svelte streaming SSR.
 *
 * @example
 * ```ts
 * const { head, wrapStream } = createStreamableHead()
 * setContext(UnheadContextKey, head)
 *
 * const stream = render(App)
 * return wrapStream(stream, template)
 * ```
 */
export function createStreamableHead(options: CreateStreamableServerHeadOptions = {}): SvelteStreamableHeadContext {
  const { head } = _createStreamableHead(options)

  // Track shell render state - HeadStream skips entries until shell is rendered
  let shellRendered = false
  ;(head as any)._shellRendered = () => shellRendered

  return {
    head,
    wrapStream: (stream: ReadableStream<Uint8Array>, template: string) => {
      // Capture shell state before clearing entries
      const preRenderedState = head.render() as SSRHeadPayload
      head.entries.clear()
      // Mark shell as rendered so HeadStream starts outputting streaming updates
      shellRendered = true
      return coreWrapStream(head, stream, template, '<!--app-html-->', preRenderedState)
    },
  }
}

export type { Unhead } from 'unhead/types'
