import { getCurrentInstance, onActivated, onBeforeUnmount, onDeactivated, ref, watch, watchEffect } from 'vue'
import type { ActiveHeadEntry, HeadEntryOptions, MergeHead } from '@unhead/schema'
import type { Ref } from 'vue'
import { resolveUnrefHeadInput } from '../utils'
import { injectHead } from './injectHead'
import type { ReactiveHead, UseHeadInput, UseHeadOptions, VueHeadClient } from '../types'

export function useHead<T extends MergeHead>(input: UseHeadInput<T>, options: UseHeadOptions = {}): ActiveHeadEntry<UseHeadInput<T>> | void {
  const head = options.head || injectHead()
  if (head) {
    if (!head.ssr)
      return clientUseHead(head, input, options as HeadEntryOptions)
    return head.push(input, options as HeadEntryOptions)
  }
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
