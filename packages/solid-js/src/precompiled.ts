import type { PrecompiledClientHead } from 'unhead/precompiled/client'
import type { PrecompiledServerHead } from 'unhead/precompiled/server'
import type { ResolvableHead, UseSeoMetaInput } from 'unhead/types'

export type PrecompiledSolidHead = PrecompiledClientHead | PrecompiledServerHead

function uncompiled(): never {
  throw new Error('[unhead] @unhead/solid-js/precompiled calls must be compiled by @unhead/bundler')
}

/** Compile-only head factory replaced with the active build target. @experimental */
export function createHead(_options?: { disableDefaults?: boolean }): never {
  return uncompiled()
}

/** Declare static head input for a target-specific precompiled runtime. @experimental */
export function useHead(_input: ResolvableHead, _options: { head: PrecompiledSolidHead }): void {
  uncompiled()
}

/** Declare static SEO input for a target-specific precompiled runtime. @experimental */
export function useSeoMeta(_input: UseSeoMetaInput, _options: { head: PrecompiledSolidHead }): void {
  uncompiled()
}
