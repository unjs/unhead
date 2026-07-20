import type { ReactNode } from 'react'
import type { PrecompiledClientHead } from 'unhead/precompiled/client'
import type { PrecompiledServerHead } from 'unhead/precompiled/server'
import type { UseHeadInput, UseSeoMetaInput } from 'unhead/types'
import { createContext } from 'react'

type PrecompiledReactHead = PrecompiledClientHead | PrecompiledServerHead

export interface PrecompiledReactEntryOptions {
  head?: PrecompiledReactHead
}

export interface UnheadProviderProps {
  children: ReactNode
  head?: PrecompiledReactHead
  value?: PrecompiledReactHead
}

function uncompiled(): never {
  throw new Error(
    '[@unhead/react] precompiled APIs require experimental precompile and a target-aware build',
  )
}

/** Compile-only head factory replaced with the active build target. */
export function createHead(_options?: { disableDefaults?: boolean }): never {
  return uncompiled()
}

export const UnheadContext = /* @__PURE__ */ createContext<PrecompiledReactHead | null>(null)

/** Compile-only provider replaced with the active build target. */
export function UnheadProvider(_props: UnheadProviderProps): never {
  return uncompiled()
}

/** Compile-only context reader replaced with the active build target. */
export function useUnhead(): never {
  return uncompiled()
}

/** Compile-only React head composable. The bundler replaces this entry with the active build target. */
export function useHead(_input: UseHeadInput, _options: PrecompiledReactEntryOptions = {}): void {
  uncompiled()
}

/** Compile-only React SEO composable. The bundler replaces this entry with the active build target. */
export function useSeoMeta(_input: UseSeoMetaInput, _options: PrecompiledReactEntryOptions = {}): void {
  uncompiled()
}
