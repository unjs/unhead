import type { PrecompiledClientEntry, PrecompiledClientInput } from 'unhead/precompiled/client'
import type { PrecompiledCsrClientHead } from 'unhead/precompiled/client-csr'
import type { Plugin } from 'vue'
import type { UseHeadInput, UseSeoMetaInput } from '../types'
import { createHead as createClientHead, renderDOMHead } from 'unhead/precompiled/client-csr'
import { getCurrentInstance, getCurrentScope, onActivated, onBeforeUnmount, onDeactivated } from 'vue'
import { injectHead, vueInstall } from '../install'

export { renderDOMHead }

export type VuePrecompiledCsrClientHead = PrecompiledCsrClientHead & Plugin

/** Create a lifecycle-aware SPA-only Vue client around the sealed client runtime. @experimental */
export function createHead(): VuePrecompiledCsrClientHead {
  const head = createClientHead() as VuePrecompiledCsrClientHead
  head.install = vueInstall(head as never)
  return head
}

/** Add one build-finalized SPA-only client plan to the injected head. @experimental */
export function useHead(input: UseHeadInput, options: { head?: VuePrecompiledCsrClientHead } = {}): PrecompiledClientEntry {
  const scope = getCurrentScope()
  if (scope && !scope.active)
    return { dispose() {} }

  const head = options.head || injectHead() as unknown as VuePrecompiledCsrClientHead
  const plan = input as unknown as PrecompiledClientInput
  const entry = head.push(plan)
  const id = head._c
  if (getCurrentInstance()) {
    onBeforeUnmount(() => entry.dispose())
    const setActive = (active: boolean) => {
      if (head._e.has(id)) {
        head._e.set(id, active ? plan : [])
        head.render()
      }
    }
    onDeactivated(() => setActive(false))
    onActivated(() => setActive(true))
  }
  return entry
}

/** Add one build-finalized static SPA-only SEO plan to the injected head. @experimental */
export const useSeoMeta = useHead as (input: UseSeoMetaInput, options?: { head?: VuePrecompiledCsrClientHead }) => PrecompiledClientEntry
