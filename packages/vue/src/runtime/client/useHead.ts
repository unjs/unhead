import type { Ref } from 'vue'
import { getCurrentInstance, onBeforeUnmount, ref, watch, watchEffect } from 'vue'
import type { ActiveHeadEntry, HeadEntryOptions } from '@unhead/schema'
import type { UseHeadInput } from '../../index'
import { injectHead, resolveUnrefHeadInput } from '../../index'
import type {
  ReactiveHead,
} from '../../types'

export function useHead(input: UseHeadInput, options: HeadEntryOptions = {}) {
  const head = injectHead()

  const vm = getCurrentInstance()

  if (!vm) {
    head.push(input, options)
    return
  }

  const resolvedInput: Ref<ReactiveHead> = ref({})
  watchEffect(() => {
    resolvedInput.value = resolveUnrefHeadInput(input)
  })
  let entry: ActiveHeadEntry<ReactiveHead>
  watch(resolvedInput, (e) => {
    if (!entry)
      entry = head.push(e, options)

    else
      entry.patch(e)
  }, { immediate: true })

  onBeforeUnmount(() => {
    entry?.dispose()
  })
}
