import type { ActiveHeadEntry, HeadEntryOptions, MergeHead } from '@unhead/schema'
import type { Ref } from 'vue'
import { getCurrentInstance, onActivated, onBeforeUnmount, onDeactivated, ref, watch, watchEffect } from 'vue'
import type { ReactiveHead, UseHeadInput, VueHeadClient } from '../types'
import { resolveUnrefHeadInput } from '../utils'
import { injectHead } from './injectHead'

export function useHead<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput<T>> | void {
  const head = injectHead()
  if (!head.ssr)
    return clientUseHead(head, input, options)
  return head.push(input, options)
}

function clientUseHead<T extends MergeHead>(head: VueHeadClient<T>, input: UseHeadInput<T>, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput<T>> {
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
