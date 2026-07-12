import type { WebStreamableHeadContext } from 'unhead/stream/server'
import type { CreateStreamableServerHeadOptions, ResolvableHead } from 'unhead/types'
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
export type SvelteStreamableHeadContext<I = ResolvableHead> = WebStreamableHeadContext<I>

type CreateStreamableHeadArgs<Input> = ResolvableHead extends Input
  ? [options?: CreateStreamableServerHeadOptions<Input>]
  : [options: CreateStreamableServerHeadOptions<Input> & { disableDefaults: true }]

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
export function createStreamableHead(options?: CreateStreamableServerHeadOptions<ResolvableHead>): SvelteStreamableHeadContext<ResolvableHead>
export function createStreamableHead<I>(options: CreateStreamableServerHeadOptions<I> & { disableDefaults: true }): SvelteStreamableHeadContext<I>
export function createStreamableHead<I>(options: CreateStreamableServerHeadOptions<I>): SvelteStreamableHeadContext<I | ResolvableHead>
export function createStreamableHead<I = ResolvableHead>(...args: CreateStreamableHeadArgs<I>): SvelteStreamableHeadContext<I>
export function createStreamableHead<I = ResolvableHead>(options: CreateStreamableServerHeadOptions<I> = {}): SvelteStreamableHeadContext<I> {
  const { head } = _createStreamableHead<I>(options as CreateStreamableServerHeadOptions<I> & { disableDefaults: true })

  // Track shell render state - HeadStream skips entries until shell is rendered
  let shellRendered = false
  ;(head as any)._shellRendered = () => shellRendered

  return {
    head,
    wrapStream: (stream: ReadableStream<Uint8Array>, template: string) => {
      // Capture shell state before clearing entries
      const preRenderedState = head.render()
      head.entries.clear()
      // Mark shell as rendered so HeadStream starts outputting streaming updates
      shellRendered = true
      return coreWrapStream(head, stream, template, preRenderedState)
    },
  }
}

export type { Unhead } from 'unhead/types'
