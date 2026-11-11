import type { LazyHeadOptions, LazyUnhead } from 'unhead/lazy'
import type { UseHeadInput, VueHeadClient } from './types'
import { createHead as _createHead } from 'unhead/lazy'
import { getCurrentInstance } from 'vue'
import { vueInstall } from './install'

/**
 * @experimental
 */
export type LazyVueHead = LazyUnhead<UseHeadInput> & VueHeadClient<UseHeadInput, boolean>

// Hydration sets vnode.el before setup runs. So a mounted component, or one with no
// server element, is making a call that the server cannot have rendered.
function _isClientOnlyPush() {
  const vm = getCurrentInstance()
  return !!vm && (vm.isMounted || !vm.vnode.el)
}

// The component that pushes an entry, for dev warnings
function _entrySource() {
  const type = getCurrentInstance()?.type as { __file?: string, __name?: string, name?: string } | undefined
  return type && (type.__file || type.__name || type.name)
}

/**
 * The lazy head for a server rendered Vue app. It loads the DOM runtime only when a
 * change needs it, or at idle with `load: 'idle'`.
 *
 * @experimental The lazy head API may change in a future minor release.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: LazyHeadOptions = {}): LazyVueHead {
  const head = _createHead<UseHeadInput>({ _isClientOnlyPush, _entrySource, ...options } as LazyHeadOptions) as LazyVueHead
  head.install = vueInstall(head)
  return head
}

export type {
  LazyHeadOptions,
}
