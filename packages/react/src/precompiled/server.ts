import type { ReactNode } from 'react'
import type { PrecompiledHeadInput, PrecompiledHeadOptions, PrecompiledServerHead } from 'unhead/precompiled/server'
import type { UseHeadInput, UseSeoMetaInput } from 'unhead/types'
import { createContext, createElement, useContext } from 'react'
import { createHead as createCoreHead } from 'unhead/precompiled/server'

export { createServerRenderer, renderSSRHead, resolveTags } from 'unhead/precompiled/server'

export const UnheadContext = /* @__PURE__ */ createContext<PrecompiledServerHead | null>(null)

export interface PrecompiledReactServerEntryOptions {
  head?: PrecompiledServerHead
}

/** Create a capability-limited React server head for build-finalized entries. */
/* @__NO_SIDE_EFFECTS__ */
export function createHead(options?: PrecompiledHeadOptions): PrecompiledServerHead {
  return createCoreHead(options)
}

export function useUnhead(): PrecompiledServerHead {
  const head = useContext(UnheadContext)
  if (!head || !('_p' in head))
    throw new Error('useHead() was called without a precompiled React server provider.')
  return head
}

/** Append one build-finalized plan per mounted React server component lifecycle. */
export function useHead(input: UseHeadInput, options: PrecompiledReactServerEntryOptions = {}): void {
  const context = useContext(UnheadContext)
  const head = options.head || (context && '_p' in context ? context : undefined)
  if (!head)
    throw new Error('useHead() was called without a precompiled React server provider.')
  head._p.push(input as unknown as PrecompiledHeadInput)
}

export const useSeoMeta = useHead as (
  input: UseSeoMetaInput,
  options?: PrecompiledReactServerEntryOptions,
) => void

export interface UnheadProviderProps {
  children: ReactNode
  head?: PrecompiledServerHead
  value?: PrecompiledServerHead
}

export function UnheadProvider({ children, head, value }: UnheadProviderProps) {
  return createElement(UnheadContext.Provider, { value: head || value || null }, children)
}

export type {
  PrecompiledHeadInput,
  PrecompiledHeadOptions,
  PrecompiledServerHead,
}
