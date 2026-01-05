import type { ReactNode } from 'react'
import { createElement } from 'react'

/**
 * Client-side HeadStream - renders empty script with suppressHydrationWarning
 * to match server-side structure without hydration mismatch errors.
 */
export function HeadStream(): ReactNode {
  return createElement('script', { suppressHydrationWarning: true })
}

// Re-export everything from the base client module
export * from '../client'
// Export streaming-specific items only
export {
  type CreateStreamableClientHeadOptions,
  createStreamableHead,
  DEFAULT_STREAM_KEY,
  type UnheadStreamQueue,
} from 'unhead/stream/client'
