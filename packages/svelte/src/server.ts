import type { CreateStreamableServerHeadOptions, Unhead } from 'unhead/types'
import { getContext } from 'svelte'
import { createStreamableHead as _createStreamableHead, renderSSRHeadSuspenseChunkSync } from 'unhead/stream/server'
import { UnheadContextKey } from './context'

export { UnheadContextKey } from './context'

export { createHead, extractUnheadInputFromHtml, renderSSRHead, transformHtmlTemplate } from 'unhead/server'

// Experimental streaming support
export {
  renderSSRHeadClosing,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  streamWithHead,
} from 'unhead/stream/server'

export function createStreamableHead(options: CreateStreamableServerHeadOptions = {}): Unhead {
  return _createStreamableHead(options)
}

/**
 * Streaming script function for Svelte.
 * Returns HTML string to be rendered with {@html}.
 * The Vite plugin with streaming: true auto-injects this.
 *
 * @example
 * ```svelte
 * <script>
 *   import { HeadStreamScript } from '@unhead/svelte/server'
 *   useHead({ title: 'My Page' })
 * </script>
 * {@html HeadStreamScript()}
 * ```
 */
export function HeadStreamScript(): string {
  const head = getContext<Unhead | null>(UnheadContextKey)
  if (!head)
    return ''

  const update = renderSSRHeadSuspenseChunkSync(head)
  if (!update)
    return ''

  return `<script>${update}</script>`
}

export type {
  CreateServerHeadOptions,
  CreateStreamableServerHeadOptions,
  SSRHeadPayload,
  Unhead,
} from 'unhead/types'
