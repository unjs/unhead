import type { Ref } from 'vue'
import { getCurrentInstance, onActivated, onBeforeUnmount, onDeactivated, ref, watch, watchEffect } from 'vue'
import type { ActiveHeadEntry, HeadEntryOptions, MergeHead } from '@unhead/schema'
import type { ReactiveHead, UseHeadInput } from '../../..'
import { injectHead, resolveUnrefHeadInput } from '../../..'

export function clientUseHead<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput<T>> {
  const head = injectHead()
  const deactivated = ref(false)

  const resolvedInput: Ref<ReactiveHead> = ref({})
  watchEffect(() => {
    resolvedInput.value = deactivated.value
      ? {}
      : resolveUnrefHeadInput(input)
  })
  const entry: ActiveHeadEntry<UseHeadInput<T>> = head.push(resolvedInput.value, options)
  watch(resolvedInput, (e) => {
      entry.patch(e)
  })

  const vm = getCurrentInstance()

  if (vm) {
    onBeforeUnmount(() => {
      entry.dispose()
    })

    onDeactivated(() => {
      deactivated.value = true
    })
    onActivated(() => {
      deactivated.value = false
    })
  }
  return entry
}
