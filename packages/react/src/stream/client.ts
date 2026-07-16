import type { ReactElement, ReactNode } from 'react'
import type { CompatibleHead, ResolvableHead, Unhead, UseHeadInput } from 'unhead/types'
import { createElement } from 'react'
import { UnheadContext } from '../context'

export interface UnheadProviderProps<I = UseHeadInput, RenderResult = unknown> {
  value: CompatibleHead<I, ResolvableHead, RenderResult>
  children: ReactNode
}

export function UnheadProvider<I = UseHeadInput, RenderResult = unknown>({ value, children }: UnheadProviderProps<I, RenderResult>): ReactElement {
  return createElement(UnheadContext.Provider, { value: value as unknown as Unhead }, children)
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
  type StreamingGlobal,
  type UnheadStreamQueue,
} from 'unhead/stream/client'
