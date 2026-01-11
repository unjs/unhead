import type { ReactNode } from 'react'
import type { Unhead } from 'unhead/types'
import { createElement } from 'react'
import { UnheadContext } from '../context'

export function UnheadProvider({ value, children }: { value: Unhead, children: ReactNode }): ReactNode {
  return createElement(UnheadContext.Provider, { value }, children)
}

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
