import type { ReactNode } from 'react'
import type { PrecompiledClientInput } from 'unhead/precompiled/client'
import type { DeferredPrecompiledClientHead } from 'unhead/precompiled/client-deferred'
import type { UseHeadInput, UseSeoMetaInput } from 'unhead/types'
import { createContext, createElement, useContext, useEffect, useRef } from 'react'
import { createHead as createCoreHead } from 'unhead/precompiled/client-deferred'

export { renderDOMHead } from 'unhead/precompiled/client-deferred'

export const UnheadContext = /* @__PURE__ */ createContext<DeferredPrecompiledClientHead | null>(null)

export interface PrecompiledReactDeferredEntryOptions {
  head?: DeferredPrecompiledClientHead
}

/** Create an SSR-first React head that queues plans while its DOM runtime loads. */
/* @__NO_SIDE_EFFECTS__ */
export function createHead(): DeferredPrecompiledClientHead {
  return createCoreHead()
}

export function useUnhead(): DeferredPrecompiledClientHead {
  const head = useContext(UnheadContext)
  if (!head || !('push' in head))
    throw new Error('useHead() was called without a precompiled React deferred provider.')
  return head
}

/** Queue a build-finalized plan after commit and dispose it with the React owner. */
export function useHead(input: UseHeadInput, options: PrecompiledReactDeferredEntryOptions = {}): void {
  const context = useContext(UnheadContext)
  const head = options.head || (context && 'push' in context ? context : undefined)
  if (!head)
    throw new Error('useHead() was called without a precompiled React deferred provider.')
  const plan = input as unknown as PrecompiledClientInput
  useEffect(() => {
    const entry = head.push(plan)
    return entry.dispose
  }, [head, plan])
}

export const useSeoMeta = useHead as (
  input: UseSeoMetaInput,
  options?: PrecompiledReactDeferredEntryOptions,
) => void

export interface UnheadProviderProps {
  children: ReactNode
  head?: DeferredPrecompiledClientHead
  value?: DeferredPrecompiledClientHead
}

export function UnheadProvider({ children, head, value }: UnheadProviderProps) {
  const headRef = useRef<DeferredPrecompiledClientHead | null>(null)
  if (!head && !value && !headRef.current)
    headRef.current = createHead()
  return createElement(UnheadContext.Provider, { value: head || value || headRef.current }, children)
}

export type {
  DeferredPrecompiledClientHead,
  PrecompiledClientInput,
}
