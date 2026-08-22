import type { PrecompiledHeadInput, PrecompiledServerHead } from 'unhead/precompiled/server'
import type { ResolvableHead, UseSeoMetaInput } from 'unhead/types'

export { createHead, createServerRenderer, renderSSRHead, resolveTags } from 'unhead/precompiled/server'
export type { PrecompiledHeadInput, PrecompiledHeadOptions, PrecompiledServerHead, PrecompiledTag } from 'unhead/precompiled/server'

/** Append one build-finalized plan for this SSR render. @experimental */
export function useHead(input: ResolvableHead, options: { bindings?: readonly (() => unknown)[], head: PrecompiledServerHead }): void {
  options.head._p.push(options.bindings ? [input as unknown as PrecompiledHeadInput, options.bindings] : input as unknown as PrecompiledHeadInput)
}

/** Append one build-finalized SEO plan for this SSR render. @experimental */
export const useSeoMeta = useHead as (input: UseSeoMetaInput, options: { bindings?: readonly (() => unknown)[], head: PrecompiledServerHead }) => void
