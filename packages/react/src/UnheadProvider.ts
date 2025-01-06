import type { CreateHeadOptions, Unhead } from '@unhead/schema'
import type { ReactNode } from 'react'
import { createContext, createElement } from 'react'
import { createHead, createServerHead } from 'unhead'

export const UnheadContext = createContext<Unhead | null>(null)

export function UnheadProvider({ children, options }: { children: ReactNode, options: CreateHeadOptions }) {
  const head = unheadCtx.tryUse() || (typeof window !== 'undefined' ? createHead(options) : createServerHead(options))
  return createElement(UnheadContext.Provider, { value: head }, children)
}
