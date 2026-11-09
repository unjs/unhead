import type { CompiledClientHeadOptions, CompiledClientUnhead } from 'unhead/compiled/client'
import type { UseHeadInput, VueHeadClient } from '../types'
import { createHead as _createHead } from 'unhead/compiled/client'
import { getCurrentInstance } from 'vue'
import { vueInstall } from '../install'

/**
 * @experimental
 */
export type CompiledVueClientHead = CompiledClientUnhead<UseHeadInput> & VueHeadClient<UseHeadInput, boolean>

// Hydration sets vnode.el before setup runs. So a mounted component, or one with no
// server element, is making a call that the server cannot have rendered.
function isClientOnlyPush() {
  const vm = getCurrentInstance()
  return !!vm && (vm.isMounted || !vm.vnode.el)
}

// The component that pushes an entry, for dev warnings
function entrySource() {
  const type = getCurrentInstance()?.type as { __file?: string, __name?: string, name?: string } | undefined
  return type && (type.__file || type.__name || type.name)
}

/**
 * The client head of compiler mode for a server rendered Vue app. It loads the v3 DOM
 * runtime on the first head change, or at idle with `load: 'idle'`.
 *
 * @experimental The compiler mode API may change in a future minor release.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: CompiledClientHeadOptions = {}): CompiledVueClientHead {
  const head = _createHead<UseHeadInput>({ isClientOnlyPush, entrySource, ...options }) as CompiledVueClientHead
  head.install = vueInstall(head)
  return head
}

export type {
  CompiledClientHeadOptions,
}
