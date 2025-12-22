import type { ReactNode } from 'react'
import { createElement, useContext } from 'react'
import { renderSSRHeadSuspenseChunkSync } from 'unhead/stream/server'
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
  if (!update)
    return null

  return createElement('script', { dangerouslySetInnerHTML: { __html: update } })
}

export * from '../server'
export * from 'unhead/stream/server'
