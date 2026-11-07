import type { CompiledTags, LazyHeadEntry, LazyUnhead } from 'unhead/lazy'
import type { MaybeRefOrGetter } from 'vue'
import type { UseHeadOptions } from '../types'
import { acceptCompiledTags } from 'unhead/lazy'
import { getCurrentInstance, getCurrentScope, onActivated, onBeforeUnmount, onDeactivated, onScopeDispose, toValue, watchEffect } from 'vue'
import { injectHead } from '../install'

export type { CompiledTags } from 'unhead/lazy'

/**
 * `useHead` for compiled tags on a lazy head. With values, one effect reads each value and
 * patches the entry. Without values, no effect runs.
 *
 * @experimental
 */
export function useCompiledHead(compiledTags: CompiledTags, values?: readonly MaybeRefOrGetter<unknown>[], options: UseHeadOptions = {}): LazyHeadEntry<any> {
  const head = acceptCompiledTags((options.head || injectHead()) as unknown as LazyUnhead<any>)
  const scope = getCurrentScope()
  // a stopped scope cannot run an effect, so the component is gone
  if (scope && !scope.active)
    return { patch() {}, dispose() {}, _i: -1 }
  if (options.onRendered && scope) {
    const onRendered = options.onRendered
    options = { ...options, onRendered: ctx => scope.run(() => onRendered(ctx)) }
  }

  let active = true
  let entry: LazyHeadEntry<any>
  const apply = () => {
    const input = active ? compiledTags : []
    const resolved = values?.map(entryValue => toValue(entryValue))
    if (entry)
      entry.patch(input, { values: resolved })
    else
      entry = head.push(input, { ...options, values: resolved } as any)
  }
  values ? watchEffect(apply) : apply()

  const vm = getCurrentInstance()
  if (vm) {
    onBeforeUnmount(() => entry.dispose())
    onDeactivated(() => {
      active = false
      apply()
    })
    onActivated(() => {
      active = true
      apply()
    })
  }
  else if (scope) {
    onScopeDispose(() => entry.dispose())
  }
  return entry!
}
