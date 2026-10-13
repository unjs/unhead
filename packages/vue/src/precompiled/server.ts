import type { PrecompiledHeadInput, PrecompiledHeadOptions, PrecompiledServerHead } from 'unhead/precompiled/server'
import type { Plugin } from 'vue'
import type { UseHeadInput, UseSeoMetaInput } from '../types'
import { createHead as createServerHead } from 'unhead/precompiled/server'
import { injectHead, vueInstall } from '../install'

export { createServerRenderer, renderSSRHead } from 'unhead/precompiled/server'

export type VuePrecompiledServerHead = PrecompiledServerHead & Plugin

/** Create a Vue server head around the sealed server runtime. @experimental */
export function createHead(options: PrecompiledHeadOptions = {}): VuePrecompiledServerHead {
  const head = createServerHead(options) as VuePrecompiledServerHead
  head.install = vueInstall(head as never)
  return head
}

/** Append one build-finalized server plan to the injected head. @experimental */
export function useHead(input: UseHeadInput, options: { head?: VuePrecompiledServerHead } = {}): void {
  const head = options.head || injectHead() as unknown as VuePrecompiledServerHead
  head._p.push(input as unknown as PrecompiledHeadInput)
}

/** Append one build-finalized static SEO plan to the injected head. @experimental */
export const useSeoMeta = useHead as (input: UseSeoMetaInput, options?: { head?: VuePrecompiledServerHead }) => void
