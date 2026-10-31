import type { PrecompiledClientHead } from '@unhead/vue/precompiled/client'
import type { PrecompiledServerHead } from '@unhead/vue/precompiled/server'

/**
 * The sealed head instance created by the local `sealed-head` module.
 * Pass it explicitly to precompiled composables: `useSeoMeta({ ... }, { head })`.
 */
export function useSealedHead(): PrecompiledClientHead | PrecompiledServerHead {
  return useNuxtApp().$sealedHead as PrecompiledClientHead | PrecompiledServerHead
}
