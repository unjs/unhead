import type { PrecompiledClientHead, PrecompiledClientInput } from 'unhead/precompiled/client'
import type { ResolvableHead, UseSeoMetaInput } from 'unhead/types'
import { onCleanup } from 'solid-js'

export { createHead, renderDOMHead } from 'unhead/precompiled/client'
export type { PrecompiledClientEntry, PrecompiledClientHead, PrecompiledClientInput, PrecompiledClientTag } from 'unhead/precompiled/client'

/** Mount one build-finalized client plan for the current Solid owner. @experimental */
export function useHead(input: ResolvableHead, options: { head: PrecompiledClientHead }): void {
  const entry = options.head.push(input as unknown as PrecompiledClientInput)
  onCleanup(entry.dispose)
}

/** Mount one build-finalized SEO plan for the current Solid owner. @experimental */
export const useSeoMeta = useHead as (input: UseSeoMetaInput, options: { head: PrecompiledClientHead }) => void
