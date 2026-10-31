import type { ResolvableHead, SSRHeadPayload, UseSeoMetaInput } from 'unhead/types'

export type PrecompiledServerSnapshot = Readonly<SSRHeadPayload>

export function createHead(): PrecompiledServerSnapshot
export function createHead(snapshot?: PrecompiledServerSnapshot): PrecompiledServerSnapshot {
  if (!snapshot)
    return uncompiled()
  return snapshot
}

/** Return a build-finalized SSR payload without runtime resolution. @experimental */
export function renderSSRHead(head: PrecompiledServerSnapshot): PrecompiledServerSnapshot {
  return head
}

/** Create a renderer for a build-finalized SSR payload. @experimental */
export function createServerRenderer() {
  return (head: PrecompiledServerSnapshot): SSRHeadPayload => head
}

function uncompiled(): never {
  throw new Error('[unhead] snapshot calls must be compiled by @unhead/bundler')
}

/** @experimental */
export function useHead(_input: ResolvableHead, _options: { head: PrecompiledServerSnapshot }): void {
  uncompiled()
}

/** @experimental */
export function useSeoMeta(_input: UseSeoMetaInput, _options: { head: PrecompiledServerSnapshot }): void {
  uncompiled()
}
