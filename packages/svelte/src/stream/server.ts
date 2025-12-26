import type { CreateStreamableServerHeadOptions, Unhead } from 'unhead/types'
import { getContext } from 'svelte'
import { createStreamableHead as _createStreamableHead, renderSSRHeadSuspenseChunk } from 'unhead/stream/server'
import { UnheadContextKey } from '../context'

export { UnheadContextKey } from '../context'

export {
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
} from 'unhead/stream/server'

/**
 * Streaming script function for Svelte.
 * Returns HTML string to be rendered with {@html}.
 * The Vite plugin with streaming: true auto-injects this.
 */
export function HeadStreamScript(): string {
  const head = getContext<Unhead | null>(UnheadContextKey)
  if (!head)
    return ''

  const update = renderSSRHeadSuspenseChunk(head)
  if (!update)
    return ''

  return `<script>${update}</script>`
}

export function createStreamableHead(options: CreateStreamableServerHeadOptions = {}): Unhead {
  return _createStreamableHead(options)
}

export type {
  CreateStreamableServerHeadOptions,
  Unhead,
} from 'unhead/types'
