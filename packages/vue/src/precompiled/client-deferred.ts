import type { PrecompiledClientInput } from 'unhead/precompiled/client'
import type { DeferredPrecompiledClientEntry, DeferredPrecompiledClientHead } from 'unhead/precompiled/client-deferred'
import type { Plugin } from 'vue'
import type { UseHeadInput, UseSeoMetaInput } from '../types'
import { createHead as createClientHead, renderDOMHead } from 'unhead/precompiled/client-deferred'
import { getCurrentInstance, getCurrentScope, onActivated, onBeforeUnmount, onDeactivated } from 'vue'
import { injectHead, vueInstall } from '../install'

export { renderDOMHead }

export type VueDeferredPrecompiledClientHead = DeferredPrecompiledClientHead & Plugin

/** Create a lifecycle-aware SSR-first Vue client that loads its DOM runtime asynchronously. @experimental */
export function createHead(): VueDeferredPrecompiledClientHead {
  const head = createClientHead() as VueDeferredPrecompiledClientHead
  head.install = vueInstall(head as never)
  return head
}

/** Queue one build-finalized client plan on the injected head. @experimental */
export function useHead(input: UseHeadInput, options: { head?: VueDeferredPrecompiledClientHead } = {}): DeferredPrecompiledClientEntry {
  const scope = getCurrentScope()
  if (scope && !scope.active)
    return { _setActive() {}, dispose() {} }

  const head = options.head || injectHead() as unknown as VueDeferredPrecompiledClientHead
  const entry = head.push(input as unknown as PrecompiledClientInput)
  if (getCurrentInstance()) {
    onBeforeUnmount(() => entry.dispose())
    onDeactivated(() => entry._setActive(false))
    onActivated(() => entry._setActive(true))
  }
  return entry
}

/** Queue one build-finalized static SEO plan on the injected head. @experimental */
export const useSeoMeta = useHead as (input: UseSeoMetaInput, options?: { head?: VueDeferredPrecompiledClientHead }) => DeferredPrecompiledClientEntry
