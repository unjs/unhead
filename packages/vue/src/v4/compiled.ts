/** Vue lifecycle adapter for strict compiled plans. */
import type { CompiledEntry, CompiledEntryOptions, CompiledHead, CompiledPlan } from 'unhead/v4/client-compiled'
import { getCurrentInstance, getCurrentScope, onBeforeUnmount } from 'vue'
import { injectHead as injectVueHead } from './install'

export type { CompiledEntry, CompiledEntryOptions, CompiledHead, CompiledPlan } from 'unhead/v4/client-compiled'

export interface UseHeadOptions extends CompiledEntryOptions {
  head?: CompiledHead
}

/* @__NO_SIDE_EFFECTS__ */
export function injectHead(): CompiledHead {
  return injectVueHead() as unknown as CompiledHead
}

/**
 * Push one build-emitted plan and bind its disposal to the current component.
 * Reactive loose values are intentionally absent; dynamic data is passed as
 * precompiled string fills.
 */
export function useHead(plan: CompiledPlan, options: UseHeadOptions = {}): CompiledEntry {
  const scope = getCurrentScope()
  if (scope && !scope.active)
    return { patch() {}, dispose() {} }

  const head = options.head || injectHead()
  const entry = head.push(plan, options.fills ? { fills: options.fills } : undefined)
  if (getCurrentInstance())
    onBeforeUnmount(entry.dispose)
  return entry
}
