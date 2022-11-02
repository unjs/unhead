import type { Ref } from 'vue'
import { getCurrentInstance, nextTick, onBeforeUnmount, ref, watch, watchEffect } from 'vue'
import { debouncedUpdateDom } from 'unhead/client'
import type { ActiveHeadEntry, HeadEntryOptions } from 'unhead'
import { injectHead, resolveUnrefHeadInput } from '../../index'
import type {
  ReactiveHead,
} from '../../types'

export function useHead(input: ReactiveHead, options: HeadEntryOptions = {}) {
  const head = injectHead()

  const vm = getCurrentInstance()

  // vm should exist
  if (!vm) {
    head.push(
      input,
      options,
    )
    return
  }

  const sideEffects: (() => void)[] = []
  const resolvedInput: Ref<ReactiveHead> = ref({})
  watchEffect(() => {
    resolvedInput.value = resolveUnrefHeadInput(input)
  })
  let entry: ActiveHeadEntry<ReactiveHead>
  watch(resolvedInput, (e) => {
    if (!entry) {
      entry = head.push(e, options)
      sideEffects.push(() => entry?.dispose())
    }
    else {
      entry.patch(e)
      debouncedUpdateDom(nextTick, head)
    }
  }, { immediate: true })

  onBeforeUnmount(() => {
    sideEffects.forEach(fn => fn())
    if (entry)
      entry.dispose()
    debouncedUpdateDom(nextTick, head)
  })
}
