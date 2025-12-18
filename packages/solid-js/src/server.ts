import type { JSX } from 'solid-js'
import type { CreateStreamableServerHeadOptions, Unhead } from 'unhead/types'
import { useContext } from 'solid-js'
import { createStreamableHead as _createStreamableHead, renderSSRHeadSuspenseChunkSync, STREAM_MARKER } from 'unhead/stream/server'
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

function useHeadStreamScript(): string {
  const head = useContext(UnheadContext)
  if (!head)
    return ''

  const update = renderSSRHeadSuspenseChunkSync(head)
  return update || STREAM_MARKER
}

/**
 * Streaming head component for Solid.
 * Place inside Suspense boundaries after async components that use useHead.
 *
 * @example
 * ```tsx
 * <Suspense fallback={<Loading />}>
 *   <AsyncPage />
 *   <HeadStream />
 * </Suspense>
 * ```
 */
export function HeadStream(): JSX.Element | null {
  const content = useHeadStreamScript()
  if (!content)
    return null

  // Use solid's escape hatch for raw HTML
  return { t: `<script>${content}</script>` } as unknown as JSX.Element
}

export type {
  CreateServerHeadOptions,
  CreateStreamableServerHeadOptions,
  SSRHeadPayload,
  Unhead,
} from 'unhead/types'
