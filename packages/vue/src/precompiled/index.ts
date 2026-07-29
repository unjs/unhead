import type { UseHeadInput, UseSeoMetaInput } from '../types'

function uncompiled(): never {
  throw new Error('[@unhead/vue] A precompiled API reached the runtime. Enable experimental.precompile so the bundler can select the client or server adapter.')
}

/** Compile-only head factory replaced with the active build target. @experimental */
export function createHead(_options?: { disableDefaults?: boolean }): never {
  return uncompiled()
}

/** Static head input that must be finalized by the Unhead bundler. @experimental */
export function useHead(_input: UseHeadInput): never {
  return uncompiled()
}

/** Static SEO input that must be finalized by the Unhead bundler. @experimental */
export const useSeoMeta = useHead as (input: UseSeoMetaInput) => never
