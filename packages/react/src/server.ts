import type { ReactNode, SuspenseProps } from 'react'
import type { CreateStreamableServerHeadOptions, Unhead } from 'unhead/types'
import { createElement, Suspense, useContext } from 'react'
import { createStreamableHead as _createStreamableHead, renderSSRHeadSuspenseChunkSync, STREAM_MARKER } from 'unhead/stream/server'
import { UnheadContext } from './context'

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

export function UnheadProvider({ children, value }: { children?: ReactNode, value: Unhead }) {
  return createElement(UnheadContext.Provider, { value }, children)
}

/**
 * Streaming head component for React.
 * Place inside Suspense boundaries after async components that use useHead.
 *
 * Two modes:
 * 1. With streamWithHead middleware: outputs marker that gets replaced
 * 2. Without middleware: attempts to output head updates directly (works if tags already resolved)
 */
export function HeadStream(): ReactNode {
  const head = useContext(UnheadContext)
  if (!head)
    return null

  // Try to get head updates synchronously first
  const update = renderSSRHeadSuspenseChunkSync(head)

  // If we got updates, output them directly (no middleware needed)
  if (update)
    return createElement('script', { dangerouslySetInnerHTML: { __html: update } })

  // Fall back to marker for middleware-based replacement
  return createElement('script', { dangerouslySetInnerHTML: { __html: STREAM_MARKER } })
}

/**
 * Drop-in replacement for React's Suspense that automatically includes HeadStream.
 * Use this instead of Suspense for boundaries containing async components that call useHead.
 *
 * @example
 * ```tsx
 * // Instead of:
 * <Suspense fallback={<Loading />}>
 *   <AsyncPage />
 *   <HeadStream />
 * </Suspense>
 *
 * // Just use:
 * <SuspenseWithHead fallback={<Loading />}>
 *   <AsyncPage />
 * </SuspenseWithHead>
 * ```
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
  CreateServerHeadOptions,
  CreateStreamableServerHeadOptions,
  SSRHeadPayload,
  Unhead,
} from 'unhead/types'
