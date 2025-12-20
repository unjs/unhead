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

export function useHead<I = UseHeadInput>(input?: UseHeadInput, options: UseHeadOptions = {}): ActiveHeadEntry<I> {
  const head = (options.head || injectHead()) as Unhead<I>
  return head.ssr ? head.push((input || {}) as I, options as HeadEntryOptions) : clientUseHead(head, input as I, options as HeadEntryOptions)
}

function clientUseHead<I = UseHeadInput>(head: Unhead<I>, input?: I, options: HeadEntryOptions = {}): ActiveHeadEntry<I> {
  const deactivated = ref(false)
  let isStreamEntry = false

  let entry: ActiveHeadEntry<I>

  // During hydration, adopt streaming entry if available
  const streamEntries = (head as any)._hydrationComplete
    ? undefined
    : (head as any)._streamEntries as Array<ActiveHeadEntry<I> & { _streamKey?: string }> | undefined

  if (streamEntries?.length) {
    const inputKey = JSON.stringify(input)
    const matchingEntry = streamEntries.find(e => !e._streamKey || e._streamKey === inputKey)

    if (matchingEntry) {
      matchingEntry._streamKey = inputKey
      entry = matchingEntry
      isStreamEntry = true
    }
  }

  watchEffect(() => {
    const i = deactivated.value ? {} : walkResolver(input, VueResolver)
    if (entry) {
      // Skip patching stream entries - already applied during SSR
      if (!isStreamEntry) {
        entry.patch(i)
      }
    }
    else {
      entry = head.push(i, options)
    }
  })

  const vm = getCurrentInstance()
  if (vm) {
    // Mark hydration complete after first mount
    if (isStreamEntry && !(head as any)._hydrationComplete) {
      ;(head as any)._hydrationComplete = true
    }

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
