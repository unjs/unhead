import type { PrecompiledClientInput } from 'unhead/precompiled/client'
import type { DeferredPrecompiledClientHead } from 'unhead/precompiled/client-deferred'
import type { ResolvableHead, UseSeoMetaInput } from 'unhead/types'
import { onDestroy } from 'svelte'

export type { PrecompiledClientEntry, PrecompiledClientInput } from 'unhead/precompiled/client'
export { createHead, renderDOMHead } from 'unhead/precompiled/client-deferred'
export type { DeferredPrecompiledClientHead } from 'unhead/precompiled/client-deferred'

/** Queue one build-finalized client plan for the current Svelte component. @experimental */
export function useHead(input: ResolvableHead, options: { head: DeferredPrecompiledClientHead }): void {
  const entry = options.head.push(input as unknown as PrecompiledClientInput)
  onDestroy(entry.dispose)
}

/** Queue one build-finalized SEO plan for the current Svelte component. @experimental */
export const useSeoMeta = useHead as (input: UseSeoMetaInput, options: { head: DeferredPrecompiledClientHead }) => void
