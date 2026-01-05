import type { ReactNode } from 'react'
import { createElement } from 'react'

/**
 * Client-side HeadStream - renders empty script with suppressHydrationWarning
 * to match server-side structure without hydration mismatch errors.
 */
export function HeadStream(): ReactNode {
  return createElement('script', { suppressHydrationWarning: true })
}

export {
  type CreateStreamableClientHeadOptions,
  createStreamableHead,
  type UnheadStreamQueue,
} from 'unhead/stream/client'
