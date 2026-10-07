import type { ReactNode } from 'react'
import type { PrecompiledClientInput } from 'unhead/precompiled/client'
import type { PrecompiledCsrClientHead } from 'unhead/precompiled/client-csr'
import type { UseHeadInput, UseSeoMetaInput } from 'unhead/types'
import { createContext, createElement, useContext, useEffect, useRef } from 'react'
import { createHead as createCoreHead } from 'unhead/precompiled/client-csr'

export { renderDOMHead } from 'unhead/precompiled/client-csr'

export const UnheadContext = /* @__PURE__ */ createContext<PrecompiledCsrClientHead | null>(null)

export interface PrecompiledReactCsrEntryOptions {
  head?: PrecompiledCsrClientHead
}

/** Create a SPA-only React client head that never scans or adopts initial DOM nodes. */
/* @__NO_SIDE_EFFECTS__ */
export function createHead(): PrecompiledCsrClientHead {
  return createCoreHead()
}

export function useUnhead(): PrecompiledCsrClientHead {
  const head = useContext(UnheadContext)
  if (!head || !('push' in head))
    throw new Error('useHead() was called without a precompiled React CSR provider.')
  return head
}

/** Register a build-finalized SPA plan after commit and dispose it with the React owner. */
export function useHead(input: UseHeadInput, options: PrecompiledReactCsrEntryOptions = {}): void {
  const context = useContext(UnheadContext)
  const head = options.head || (context && 'push' in context ? context : undefined)
  if (!head)
    throw new Error('useHead() was called without a precompiled React CSR provider.')
  const plan = input as unknown as PrecompiledClientInput
  useEffect(() => {
    const entry = head.push(plan)
    return entry.dispose
  }, [head, plan])
}

export const useSeoMeta = useHead as (
  input: UseSeoMetaInput,
  options?: PrecompiledReactCsrEntryOptions,
) => void

export interface UnheadProviderProps {
  children: ReactNode
  head?: PrecompiledCsrClientHead
  value?: PrecompiledCsrClientHead
}

export function UnheadProvider({ children, head, value }: UnheadProviderProps) {
  const headRef = useRef<PrecompiledCsrClientHead | null>(null)
  if (!head && !value && !headRef.current)
    headRef.current = createHead()
  return createElement(UnheadContext.Provider, { value: head || value || headRef.current }, children)
}

export type {
  PrecompiledClientInput,
  PrecompiledCsrClientHead,
}
