import type { PrecompiledClientEntry, PrecompiledClientHead, PrecompiledClientInput } from 'unhead/precompiled/client'
import type { Plugin } from 'vue'
import type { UseHeadInput, UseSeoMetaInput } from '../types'
import { createHead as createClientHead, renderDOMHead } from 'unhead/precompiled/client'
import { getCurrentInstance, getCurrentScope, onActivated, onBeforeUnmount, onDeactivated } from 'vue'
import { injectHead, vueInstall } from '../install'

export { renderDOMHead }

export type VuePrecompiledClientHead = PrecompiledClientHead & Plugin

/** Create a lifecycle-aware Vue client around the sealed client runtime. @experimental */
export function createHead(): VuePrecompiledClientHead {
  const head = createClientHead() as VuePrecompiledClientHead
  head.install = vueInstall(head as never)
  return head
}

/** @internal */
const autoHead: VuePrecompiledClientHead = createHead()

/**
 * Push a transparently compiled plan to the shared auto head with component
 * lifecycle: disposal on unmount and KeepAlive activation handling. Emitted by
 * the bundler's `precompile.auto` transform; not a public API.
 * @internal
 */
export function useAutoHead(input: PrecompiledClientInput, bindings?: readonly (() => unknown)[]): PrecompiledClientEntry {
  const entry = autoHead.push(input, bindings)
  const id = autoHead._c
  if (getCurrentInstance()) {
    onBeforeUnmount(() => entry.dispose())
    const setActive = (active: boolean) => {
      if (autoHead._e.has(id)) {
        autoHead._set(id, active ? input : [])
        autoHead.render()
      }
    }
    onDeactivated(() => setActive(false))
    onActivated(() => setActive(true))
  }
  return entry
}

/** Add one build-finalized client plan to the injected head. @experimental */
export function useHead(input: UseHeadInput, options: { bindings?: readonly (() => unknown)[], head?: VuePrecompiledClientHead } = {}): PrecompiledClientEntry {
  const scope = getCurrentScope()
  if (scope && !scope.active)
    return { dispose() {} }

  const head = options.head || injectHead() as unknown as VuePrecompiledClientHead
  const plan = input as unknown as PrecompiledClientInput
  const entry = head.push(plan, options.bindings)
  const id = head._c
  if (getCurrentInstance()) {
    onBeforeUnmount(() => entry.dispose())
    const setActive = (active: boolean) => {
      if (head._e.has(id)) {
        head._set(id, active ? plan : [])
        head.render()
      }
    }
    onDeactivated(() => setActive(false))
    onActivated(() => setActive(true))
  }
  return entry
}

/** Add one build-finalized static SEO plan to the injected head. @experimental */
export const useSeoMeta = useHead as (input: UseSeoMetaInput, options?: { head?: VuePrecompiledClientHead }) => PrecompiledClientEntry
