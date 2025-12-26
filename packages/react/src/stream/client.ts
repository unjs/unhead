import type { ReactNode } from 'react'
import { createElement } from 'react'

/**
 * Client-side HeadStream - returns null to match server-side rendering
 */
export function HeadStream(): ReactNode {
  return createElement('script', { suppressHydrationWarning: true, dangerouslySetInnerHTML: { __html: '<!-- no content-->' } })
}

// Re-export everything from the base client module
export * from '../client'
// Export streaming-specific items only (not the re-exports from unhead/client)
export {
  type CreateStreamableClientHeadOptions,
  createStreamableHead,
  DEFAULT_STREAM_KEY,
  type UnheadStreamQueue,
} from 'unhead/stream/client'
