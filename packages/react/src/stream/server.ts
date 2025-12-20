import type { ReactNode } from 'react'
import type { CreateStreamableServerHeadOptions, Unhead } from 'unhead/types'
import { createElement, useContext } from 'react'
import { createStreamableHead as _createStreamableHead, renderSSRHeadSuspenseChunkSync, STREAM_MARKER } from 'unhead/stream/server'
import { UnheadContext } from '../context'

export * from '../server'

export function createStreamableHead(options: CreateStreamableServerHeadOptions = {}): Unhead {
  return _createStreamableHead(options)
}

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

export {
  renderSSRHeadClosing,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  streamWithHead,
} from 'unhead/stream/server'

export type {
  CreateStreamableServerHeadOptions,
  Unhead,
} from 'unhead/types'
