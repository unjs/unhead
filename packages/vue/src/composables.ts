import type { ActiveHeadEntry, HeadEntryOptions, Unhead } from 'unhead/types'
import type {
  UseHeadInput,
  UseHeadOptions,
  UseHeadSafeInput,
  UseSeoMetaInput,
  VueHeadClient,
} from './types'
import { FlatMetaPlugin, SafeInputPlugin } from 'unhead/plugins'
import { walkResolver } from 'unhead/utils'
import {
  getCurrentInstance,
  hasInjectionContext,
  inject,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  ref,
  watchEffect,
} from 'vue'
import { headSymbol } from './install'
import { VueResolver } from './resolver'

/* @__NO_SIDE_EFFECTS__ */
export function injectHead() {
  if (hasInjectionContext()) {
    // fallback to vue context
    const instance = inject<VueHeadClient>(headSymbol)
    if (!instance) {
      throw new Error('useHead() was called without provide context, ensure you call it through the setup() function.')
    }
    return instance
  }
  throw new Error('useHead() was called without provide context, ensure you call it through the setup() function.')
}

/* @__NO_SIDE_EFFECTS__ */
export function useHead<I = UseHeadInput>(input?: UseHeadInput, options: UseHeadOptions = {}): ActiveHeadEntry<I> {
  const head = (options.head || injectHead()) as Unhead<I>
  return head.ssr ? head.push((input || {}) as I, options as HeadEntryOptions) : clientUseHead(head, input as I, options as HeadEntryOptions)
}

/* @__NO_SIDE_EFFECTS__ */
function clientUseHead<I = UseHeadInput>(head: Unhead<I>, input?: I, options: HeadEntryOptions = {}): ActiveHeadEntry<I> {
  const deactivated = ref(false)

  let entry: ActiveHeadEntry<I>
  watchEffect(() => {
    const i = deactivated.value ? {} : walkResolver(input, VueResolver)
    if (entry) {
      entry.patch(i)
    }
    else {
      entry = head.push(i, options)
    }
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
  return entry!
}

/* @__NO_SIDE_EFFECTS__ */
export function useHeadSafe(input: UseHeadSafeInput = {}, options: UseHeadOptions = {}): ActiveHeadEntry<UseHeadSafeInput> {
  const head = options.head || injectHead()
  head.use(SafeInputPlugin)
  options._safe = true
  return useHead<UseHeadSafeInput>(input as UseHeadInput, options)
}

/* @__NO_SIDE_EFFECTS__ */
export function useSeoMeta(input: UseSeoMetaInput = {}, options: UseHeadOptions = {}): ActiveHeadEntry<UseSeoMetaInput> {
  const head = options.head || injectHead()
  head.use(FlatMetaPlugin)
  const { title, titleTemplate, ...meta } = input
  return useHead({
    title,
    titleTemplate,
    _flatMeta: meta,
  } as UseSeoMetaInput, options)
}

/**
 * @deprecated use `useHead` instead.Advanced use cases should tree shake using import.meta.* if statements.
 */
/* @__NO_SIDE_EFFECTS__ */
export function useServerHead<I = UseHeadInput>(input?: UseHeadInput, options: UseHeadOptions = {}): ActiveHeadEntry<I> {
  return useHead<I>(input as UseHeadInput, { ...options, mode: 'server' })
}

/**
 * @deprecated use `useHeadSafe` instead.Advanced use cases should tree shake using import.meta.* if statements.
 */
/* @__NO_SIDE_EFFECTS__ */
export function useServerHeadSafe(input?: UseHeadSafeInput, options: UseHeadOptions = {}): ActiveHeadEntry<UseHeadSafeInput> {
  return useHeadSafe(input, { ...options, mode: 'server' })
}

/**
 * @deprecated use `useSeoMeta` instead.Advanced use cases should tree shake using import.meta.* if statements.
 */
/* @__NO_SIDE_EFFECTS__ */
export function useServerSeoMeta(input?: UseSeoMetaInput, options: UseHeadOptions = {}): ActiveHeadEntry<UseSeoMetaInput> {
  return useSeoMeta(input, { ...options, mode: 'server' })
}

export { useScript } from './scripts/useScript'
