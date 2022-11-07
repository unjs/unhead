import type { Ref } from 'vue'
import { getCurrentInstance, nextTick, onBeforeUnmount, ref, watch, watchEffect } from 'vue'
import { debouncedRenderDOMHead } from 'unhead/client'
import type { ActiveHeadEntry, HeadEntryOptions } from 'unhead'
import { injectHead, resolveUnrefHeadInput } from '../../index'
import type {
  ReactiveHead,
} from '../../types'

export function useHead(input: ReactiveHead, options: HeadEntryOptions = {}) {
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

    debouncedRenderDOMHead(nextTick, head)
  }, { immediate: true })

  onBeforeUnmount(() => {
    entry?.dispose()
    debouncedRenderDOMHead(nextTick, head)
  })
}
