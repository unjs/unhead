import type { ReactNode } from 'react'
import { createElement, useContext } from 'react'
import { renderSSRHeadSuspenseChunk } from 'unhead/stream/server'
import { UnheadContext } from '../context'

/**
 * Streaming head component for React.
 * Place inside Suspense boundaries after async components that use useHead.
 */
export function HeadStream(): ReactNode {
  const head = useContext(UnheadContext)
  if (!head) {
    throw new Error('HeadStream not found')
  }

  const update = renderSSRHeadSuspenseChunk(head)
  if (!update) {
    // render div with text - no head
    return createElement('script', { dangerouslySetInnerHTML: { __html: `<!-- no content: ${head.entries.size}-->` } })
  }

  return createElement('script', { dangerouslySetInnerHTML: { __html: update } })
}

// Re-export everything from the base server module
export * from '../server'
// Export streaming-specific items only (not the re-exports from unhead/server)
export {
  createStreamableHead,
  type CreateStreamableServerHeadOptions,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
} from 'unhead/stream/server'
