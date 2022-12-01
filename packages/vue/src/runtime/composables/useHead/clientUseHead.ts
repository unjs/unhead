import type { Ref } from 'vue'
import { getCurrentScope, onScopeDispose, ref, watch, watchEffect } from 'vue'
import type { ActiveHeadEntry, HeadEntryOptions, MergeHead } from '@unhead/schema'
import type { ReactiveHead, UseHeadInput } from '../../..'
import { injectHead, resolveUnrefHeadInput } from '../../..'

export function clientUseHead<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput<T>> {
  const head = injectHead()

  const resolvedInput: Ref<ReactiveHead> = ref({})

  watchEffect(() => {
    resolvedInput.value = resolveUnrefHeadInput(input)
  })
  const entry: ActiveHeadEntry<UseHeadInput<T>> = head.push(resolvedInput.value, options)
  watch(resolvedInput, e => entry.patch(e))

  if (getCurrentScope()) {
    onScopeDispose(() => {
      entry.dispose()
    })
  }
  return entry
}
