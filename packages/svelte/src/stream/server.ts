import type { WebStreamableHeadContext } from 'unhead/stream/server'
import type { CreateStreamableServerHeadOptions, SSRHeadPayload } from 'unhead/types'
import {
  createStreamableHead as _createStreamableHead,
  wrapStream as coreWrapStream,
} from 'unhead/stream/server'

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
 *
 * Note: Svelte SSR is synchronous, so all head entries are captured in the shell.
 * This function exists for API parity with React/Solid but returns empty for Svelte
 * since there are no streaming head updates to emit.
 */
export function HeadStream(): string {
  // Svelte SSR is synchronous - all entries are captured in the shell render.
  // No streaming updates needed since components don't render incrementally.
  return ''
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
