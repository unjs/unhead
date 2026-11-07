import type { ReactElement, ReactNode } from 'react'
import type { UseHeadInput } from 'unhead/types'
import type { UniversalUnheadProviderProps } from '../context'
import { createElement } from 'react'
import { toUnheadContextValue, UnheadContext } from '../context'

export type UnheadProviderProps<I = UseHeadInput, RenderResult = unknown> = UniversalUnheadProviderProps<I, RenderResult>

export function UnheadProvider<I = UseHeadInput, RenderResult = unknown>({ value, children }: UnheadProviderProps<I, RenderResult>): ReactElement {
  return createElement(UnheadContext.Provider, { value: toUnheadContextValue(value) }, children)
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
