import type { PrecompiledClientHead } from 'unhead/precompiled/client'
import type { PrecompiledHeadOptions, PrecompiledServerHead } from 'unhead/precompiled/server'
import type { Plugin } from 'vue'
import type { UseHeadInput, UseSeoMetaInput } from '../types'

type VuePrecompiledHead = (PrecompiledClientHead | PrecompiledServerHead) & Partial<Plugin>

function uncompiled(): never {
  throw new Error('[@unhead/vue] A precompiled API reached the runtime. Enable experimental.precompile so the bundler can select the client or server adapter.')
}

/** Compile-only head factory replaced with the active build target. @experimental */
export function createHead(_options?: PrecompiledHeadOptions): never {
  return uncompiled()
}

/** Static head input that must be finalized by the Unhead bundler. The optional `{ head }` routes the plan to a sealed head instance instead of injection. @experimental */
export function useHead(_input: UseHeadInput, _options?: { head?: VuePrecompiledHead }): never {
  return uncompiled()
}

/** Static SEO input that must be finalized by the Unhead bundler. The optional `{ head }` routes the plan to a sealed head instance instead of injection. @experimental */
export const useSeoMeta = useHead as (input: UseSeoMetaInput, options?: { head?: VuePrecompiledHead }) => never
