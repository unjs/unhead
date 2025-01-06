import type { CreateHeadOptions, Unhead } from '@unhead/schema'
import type { ReactNode } from 'react'
import { createContext, createElement } from 'react'
import { createHead, createServerHead, tryUseUnhead } from 'unhead'

export const UnheadContext = createContext<Unhead<any> | null>(null)

export function UnheadProvider({ children, options }: { children: ReactNode, options: CreateHeadOptions }) {
  const head = tryUseUnhead() || (typeof window !== 'undefined' ? createHead(options) : createServerHead(options))
  return createElement(UnheadContext.Provider, { value: head }, children)
}
