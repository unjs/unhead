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
  getCurrentScope,
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
    if (instance) {
      return instance
    }
  }
  throw new Error('useHead() was called without provide context, ensure you call it through the setup() function.')
}

export function useHead<I = UseHeadInput>(input?: UseHeadInput, options: UseHeadOptions = {}): ActiveHeadEntry<I> {
  const head = (options.head || injectHead()) as Unhead<I>
  return head.ssr ? head.push((input || {}) as I, options as HeadEntryOptions) : clientUseHead(head, input as I, options as HeadEntryOptions)
}

function clientUseHead<I = UseHeadInput>(head: Unhead<I>, input?: I, options: HeadEntryOptions = {}): ActiveHeadEntry<I> {
  const scope = getCurrentScope()
  if (scope && !scope.active)
    return { patch() {}, dispose() {}, _poll() {} }

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

export function useHeadSafe(input: UseHeadSafeInput = {}, options: UseHeadOptions = {}): ActiveHeadEntry<UseHeadSafeInput> {
  const head = options.head || injectHead()
  head.use(SafeInputPlugin)
  options._safe = true
  return useHead<UseHeadSafeInput>(input as UseHeadInput, options)
}

export function useSeoMeta(input: UseSeoMetaInput = {}, options: UseHeadOptions = {}): ActiveHeadEntry<UseSeoMetaInput> {
  const head = options.head || injectHead()
  head.use(FlatMetaPlugin)
  const entry = useHead<UseSeoMetaInput>(normalizeSeoMetaInput(input), options)
  const corePatch = entry.patch
  entry.patch = input => corePatch(normalizeSeoMetaInput(input))
  return entry
}

function normalizeSeoMetaInput(input: UseSeoMetaInput) {
  // @ts-expect-error internal normalized input
  if (input._flatMeta)
    return input

  const meta: Record<string, any> = {}
  for (const key in input) {
    if (!Object.prototype.hasOwnProperty.call(input, key) || key === 'title' || key === 'titleTemplate')
      continue
    meta[key] = input[key as keyof UseSeoMetaInput]
  }
  return {
    title: input.title,
    titleTemplate: input.titleTemplate,
    _flatMeta: meta,
  } as UseSeoMetaInput
}

/**
 * @deprecated use `useHead` instead.Advanced use cases should tree shake using import.meta.* if statements.
 */
export function useServerHead<I = UseHeadInput>(input?: UseHeadInput, options: UseHeadOptions = {}): ActiveHeadEntry<I> {
  return useHead<I>(input as UseHeadInput, { ...options, mode: 'server' })
}

/**
 * @deprecated use `useHeadSafe` instead.Advanced use cases should tree shake using import.meta.* if statements.
 */
export function useServerHeadSafe(input?: UseHeadSafeInput, options: UseHeadOptions = {}): ActiveHeadEntry<UseHeadSafeInput> {
  return useHeadSafe(input, { ...options, mode: 'server' })
}

/**
 * @deprecated use `useSeoMeta` instead.Advanced use cases should tree shake using import.meta.* if statements.
 */
export function useServerSeoMeta(input?: UseSeoMetaInput, options: UseHeadOptions = {}): ActiveHeadEntry<UseSeoMetaInput> {
  return useSeoMeta(input, { ...options, mode: 'server' })
}

export { useScript } from './scripts/useScript'
