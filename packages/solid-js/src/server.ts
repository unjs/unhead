import type { JSX } from 'solid-js'
import type { CreateStreamableServerHeadOptions, Unhead } from 'unhead/types'
import { useContext } from 'solid-js'
import { createStreamableHead as _createStreamableHead, renderSSRHeadSuspenseChunkSync } from 'unhead/stream/server'
import { UnheadContext } from './context'

export { UnheadContext } from './context'

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
 * Streaming script component - outputs inline script with current head state.
 * Use this in components that call useHead() to stream head updates immediately.
 * The Vite plugin with streaming: true auto-injects this.
 */
export function HeadStreamScript(): JSX.Element | null {
  const head = useContext(UnheadContext)
  if (!head)
    return null

  const update = renderSSRHeadSuspenseChunkSync(head)
  if (!update)
    return null

  // Use solid's escape hatch for raw HTML
  return { t: `<script>${update}</script>` } as unknown as JSX.Element
}

export type {
  CreateServerHeadOptions,
  CreateStreamableServerHeadOptions,
  SSRHeadPayload,
  Unhead,
} from 'unhead/types'
