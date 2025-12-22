import type { ReactNode } from 'react'
import { createElement } from 'react'

/**
 * Client-side HeadStream - returns null to match server-side rendering
 */
export function HeadStream(): ReactNode {
  return createElement('script', { suppressHydrationWarning: true, dangerouslySetInnerHTML: { __html: '<!-- no content-->' } })
}

export * from '../client'
export * from 'unhead/stream/client'
