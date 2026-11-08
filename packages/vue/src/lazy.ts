import type { CompiledTags, CreateLazyHeadOptions, LazyEntryOptions, LazyHeadEntry, LazyUnhead } from 'unhead/lazy'
import type { UseHeadInput, VueHeadClient } from './types'
import { createLazyHead as _createLazyHead } from 'unhead/lazy'
import { getCurrentInstance } from 'vue'
import { vueInstall } from './install'

export type VueLazyHead = LazyUnhead<UseHeadInput> & VueHeadClient<UseHeadInput, boolean>

// Hydration sets vnode.el before setup runs. So a mounted component, or one with no
// server element, is making a call that the server cannot have rendered.
function isClientOnlyPush() {
  const vm = getCurrentInstance()
  return !!vm && (vm.isMounted || !vm.vnode.el)
}

/**
 * Creates a head for a server rendered Vue app that loads its DOM runtime lazily.
 *
 * @experimental The lazy head API may change in a future minor release.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createLazyHead(options: CreateLazyHeadOptions = {}): VueLazyHead {
  const head = _createLazyHead<UseHeadInput>({ isClientOnlyPush, ...options }) as VueLazyHead
  head.install = vueInstall(head)
  return head
}

export type {
  CompiledTags,
  CreateLazyHeadOptions,
  LazyEntryOptions,
  LazyHeadEntry,
}
