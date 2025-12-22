import type { ReactNode } from 'react'
import { createElement, useContext } from 'react'
import { renderSSRHeadSuspenseChunkSync, STREAM_MARKER } from 'unhead/stream/server'
import { UnheadContext } from '../context'

/**
 * Streaming head component for React.
 * Place inside Suspense boundaries after async components that use useHead.
 */
export function HeadStream(): ReactNode {
  const head = useContext(UnheadContext)
  if (!head)
    return null

  const update = renderSSRHeadSuspenseChunkSync(head)

  if (update)
    return createElement('script', { dangerouslySetInnerHTML: { __html: update } })

  return createElement('script', { dangerouslySetInnerHTML: { __html: STREAM_MARKER } })
}

export * from '../server'
export * from 'unhead/stream/server'
