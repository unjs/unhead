import type { ActiveHeadEntry, HeadEntryOptions, MergeHead } from 'unhead/types'
import type {
  Ref,
} from 'vue'
import type {
  UseHeadInput,
  UseHeadOptions,
  UseHeadSafeInput,
  UseSeoMetaInput,
  VueHeadClient,
} from './types'
import { FlatMetaPlugin, SafeInputPlugin } from 'unhead/plugins'
import {
  getCurrentInstance,
  hasInjectionContext,
  inject,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  ref,
  watch,
  watchEffect,
} from 'vue'
import { headSymbol } from './install'
import { resolveUnrefHeadInput } from './utils'

export function injectHead() {
  if (hasInjectionContext()) {
    // fallback to vue context
    const instance = inject<VueHeadClient<MergeHead>>(headSymbol)
    if (!instance) {
      throw new Error('useHead() was called without provide context, ensure you call it through the setup() function.')
    }
    return instance
  }
  throw new Error('useHead() was called without provide context, ensure you call it through the setup() function.')
}

export function useHead<T extends MergeHead>(input: UseHeadInput<T>, options: UseHeadOptions = {}): ActiveHeadEntry<UseHeadInput<T>> {
  const head = options.head || injectHead()
  return head.ssr ? head.push(input, options as HeadEntryOptions) : clientUseHead(head, input, options as HeadEntryOptions)
}

function clientUseHead<T extends MergeHead>(head: VueHeadClient<T>, input: UseHeadInput<T>, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput<T>> {
  const deactivated = ref(false)

  const resolvedInput: Ref<UseHeadInput<T>> = ref({})
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

export function useHeadSafe(input: UseHeadSafeInput, options: UseHeadOptions = {}): ActiveHeadEntry<any> {
  const head = options.head || injectHead()
  head.use(SafeInputPlugin)
  // @ts-expect-error untyped
  return useHead(input, Object.assign(options, { _safe: true }))
}

export function useSeoMeta(input: UseSeoMetaInput, options: UseHeadOptions = {}): ActiveHeadEntry<any> {
  const head = options.head || injectHead()
  head.use(FlatMetaPlugin)
  const { title, titleTemplate, ...meta } = input
  return useHead({
    title,
    titleTemplate,
    // @ts-expect-error runtime type
    _flatMeta: meta,
  }, options)
}

export function useServerHead<T extends MergeHead>(input: UseHeadInput<T>, options: UseHeadOptions = {}): ActiveHeadEntry<any> {
  return useHead<T>(input, { ...options, mode: 'server' })
}

export function useServerHeadSafe(input: UseHeadSafeInput, options: UseHeadOptions = {}): ActiveHeadEntry<any> {
  return useHeadSafe(input, { ...options, mode: 'server' })
}

export function useServerSeoMeta(input: UseSeoMetaInput, options?: UseHeadOptions): ActiveHeadEntry<UseSeoMetaInput> {
  return useSeoMeta(input, { ...options, mode: 'server' })
}

export { useScript } from './scripts/useScript'
