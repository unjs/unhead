import type { PrecompiledClientInput } from 'unhead/precompiled/client'
import type { PrecompiledCsrClientHead } from 'unhead/precompiled/client-csr'
import type { ResolvableHead, UseSeoMetaInput } from 'unhead/types'
import { onDestroy } from 'svelte'

export type { PrecompiledClientEntry, PrecompiledClientInput, PrecompiledClientTag } from 'unhead/precompiled/client'
export { createHead, renderDOMHead } from 'unhead/precompiled/client-csr'
export type { PrecompiledCsrClientHead } from 'unhead/precompiled/client-csr'

/** Mount one build-finalized SPA-only client plan for the current Svelte component. @experimental */
export function useHead(input: ResolvableHead, options: { head: PrecompiledCsrClientHead }): void {
  const entry = options.head.push(input as unknown as PrecompiledClientInput)
  onDestroy(entry.dispose)
}

/** Mount one build-finalized SPA-only SEO plan for the current Svelte component. @experimental */
export const useSeoMeta = useHead as (input: UseSeoMetaInput, options: { head: PrecompiledCsrClientHead }) => void
