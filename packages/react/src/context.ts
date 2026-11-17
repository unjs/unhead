import type { ReactNode } from 'react'
import type { CompatibleHead, ResolvableHead, Unhead, UseHeadInput } from 'unhead/types'
import { createContext } from 'react'

export interface UniversalUnheadProviderProps<I = UseHeadInput, RenderResult = unknown> {
  children: ReactNode
  value: CompatibleHead<I, ResolvableHead, RenderResult>
}

export function toUnheadContextValue<I, RenderResult>(
  head: Unhead<I, RenderResult>,
): Unhead<any, any> {
  return head as unknown as Unhead<any, any>
}

export const UnheadContext = /* @__PURE__ */ createContext<Unhead<any, any> | null>(null)
