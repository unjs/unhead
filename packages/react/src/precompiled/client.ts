import type { ReactNode } from 'react'
import type { PrecompiledClientHead, PrecompiledClientInput } from 'unhead/precompiled/client'
import type { UseHeadInput, UseSeoMetaInput } from 'unhead/types'
import { createContext, createElement, useContext, useEffect, useRef } from 'react'
import { createHead as createCoreHead } from 'unhead/precompiled/client'

export { renderDOMHead } from 'unhead/precompiled/client'

export const UnheadContext = /* @__PURE__ */ createContext<PrecompiledClientHead | null>(null)

export interface PrecompiledReactClientEntryOptions {
  head?: PrecompiledClientHead
}

/** Create a capability-limited React client head for build-finalized entries. */
/* @__NO_SIDE_EFFECTS__ */
export function createHead(): PrecompiledClientHead {
  return createCoreHead()
}

export function useUnhead(): PrecompiledClientHead {
  const head = useContext(UnheadContext)
  if (!head || !('push' in head))
    throw new Error('useHead() was called without a precompiled React client provider.')
  return head
}

/** Register a build-finalized plan after commit and dispose it with the React owner. */
export function useHead(input: UseHeadInput, options: PrecompiledReactClientEntryOptions = {}): void {
  const context = useContext(UnheadContext)
  const head = options.head || (context && 'push' in context ? context : undefined)
  if (!head)
    throw new Error('useHead() was called without a precompiled React client provider.')
  const plan = input as unknown as PrecompiledClientInput
  useEffect(() => {
    const entry = head.push(plan)
    return entry.dispose
  }, [head, plan])
}

export const useSeoMeta = useHead as (
  input: UseSeoMetaInput,
  options?: PrecompiledReactClientEntryOptions,
) => void

export interface UnheadProviderProps {
  children: ReactNode
  head?: PrecompiledClientHead
  value?: PrecompiledClientHead
}

export function UnheadProvider({ children, head, value }: UnheadProviderProps) {
  const headRef = useRef<PrecompiledClientHead | null>(null)
  if (!head && !value && !headRef.current)
    headRef.current = createHead()
  return createElement(UnheadContext.Provider, { value: head || value || headRef.current }, children)
}

export type {
  PrecompiledClientHead,
  PrecompiledClientInput,
}
