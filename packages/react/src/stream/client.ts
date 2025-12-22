import type { ReactNode } from 'react'
import { createElement } from 'react'

/**
 * Client-side HeadStream - renders empty script with suppressHydrationWarning
 */
export function HeadStream(): ReactNode {
  return createElement('script', {
    suppressHydrationWarning: true,
    dangerouslySetInnerHTML: { __html: '' },
  })
}

export * from '../client'
export * from 'unhead/stream/client'
