import type { ReactNode, SuspenseProps } from 'react'
import type { CreateStreamableServerHeadOptions, Unhead } from 'unhead/types'
import { createElement, Suspense, useContext } from 'react'
import { createStreamableHead as _createStreamableHead, renderSSRHeadSuspenseChunkSync, STREAM_MARKER } from 'unhead/stream/server'
import { UnheadContext } from '../context'

export {
  renderSSRHeadClosing,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  streamWithHead,
} from 'unhead/stream/server'

export function createStreamableHead(options: CreateStreamableServerHeadOptions = {}): Unhead {
  return _createStreamableHead(options)
}

export function UnheadProvider({ children, value }: { children?: ReactNode, value: Unhead }) {
  return createElement(UnheadContext.Provider, { value }, children)
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

/**
 * Drop-in replacement for React's Suspense that automatically includes HeadStream.
 */
export function SuspenseWithHead({ children, ...props }: SuspenseProps): ReactNode {
  return createElement(
    Suspense,
    props,
    children,
    createElement(HeadStream),
  )
}

export type {
  CreateStreamableServerHeadOptions,
  Unhead,
} from 'unhead/types'
