import type { CreateStreamableServerHeadOptions, Unhead } from 'unhead/types'
import { getContext } from 'svelte'
import { createStreamableHead as _createStreamableHead, renderSSRHeadSuspenseChunkSync, STREAM_MARKER } from 'unhead/stream/server'
import { UnheadContextKey } from '../context'

export { UnheadContextKey } from '../context'

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
 * Streaming head component for Svelte.
 * Returns HTML string to be rendered with {@html}.
 *
 * @example
 * ```svelte
 * {#await loadData()}
 *   <p>Loading...</p>
 * {:then data}
 *   <MyComponent {data} />
 *   {@html HeadStream()}
 * {/await}
 * ```
 */
export function HeadStream(): string {
  const head = getContext<Unhead | null>(UnheadContextKey)
  if (!head)
    return ''

  const update = renderSSRHeadSuspenseChunkSync(head)
  const content = update || STREAM_MARKER

  return `<script>${content}</script>`
}

export type {
  CreateStreamableServerHeadOptions,
  Unhead,
} from 'unhead/types'
