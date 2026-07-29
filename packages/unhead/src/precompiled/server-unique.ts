import type { ResolvableHead, SSRHeadPayload, UseSeoMetaInput } from 'unhead/types'

/** @internal */
export type PrecompiledUniqueTag = readonly [
  weight: number,
  html: string,
  position?: 0 | 1 | 2 | 3 | 4,
]

/** @internal */
export type PrecompiledUniqueHeadInput = readonly PrecompiledUniqueTag[]

export interface PrecompiledUniqueServerHead {
  /** @internal */
  _p: PrecompiledUniqueHeadInput[]
}

/** Compile-only factory replaced with an identity-free head literal. @experimental */
export function createHead(): never {
  throw new Error('[unhead] unique server heads must be compiled by @unhead/bundler')
}

/** Resolve identity-free plans whose uniqueness was proven by the build. @experimental */
function resolveTags(head: PrecompiledUniqueServerHead): PrecompiledUniqueTag[] {
  const tags: PrecompiledUniqueTag[] = []
  for (const plan of head._p) {
    for (const tag of plan)
      tags.push(tag)
  }
  return tags.sort((a, b) => a[0] - b[0])
}

/** Render identity-free build-validated plans. @experimental */
export function renderSSRHead(head: PrecompiledUniqueServerHead): SSRHeadPayload {
  const output = ['', '', '', '', '']
  for (const tag of resolveTags(head)) {
    if (tag[1])
      output[tag[2] || 0] += tag[1]
  }
  return {
    headTags: output[0],
    bodyTags: output[2],
    bodyTagsOpen: output[1],
    htmlAttrs: output[3],
    bodyAttrs: output[4],
  }
}

export function createServerRenderer() {
  return (head: PrecompiledUniqueServerHead): SSRHeadPayload => renderSSRHead(head)
}

/** Append one build-validated identity-free plan. @experimental */
export function useHead(input: ResolvableHead, options: { head: PrecompiledUniqueServerHead }): void {
  options.head._p.push(input as unknown as PrecompiledUniqueHeadInput)
}

/** Append one build-validated static SEO plan. @experimental */
export const useSeoMeta = useHead as (input: UseSeoMetaInput, options: { head: PrecompiledUniqueServerHead }) => void
