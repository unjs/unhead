import type { WebStreamableHeadContext } from 'unhead/stream/server'
import type { CreateStreamableServerHeadOptions, Unhead } from 'unhead/types'
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
  return {
    head,
    wrapStream: (stream: ReadableStream<Uint8Array>, template: string) =>
      coreWrapStream(head, stream, template),
  }
}

export type { Unhead } from 'unhead/types'
