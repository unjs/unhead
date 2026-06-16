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

  // If the owning effect scope has already been stopped — e.g. a component whose
  // `setup` resumes after an `await` once a KeepAlive/Suspense teardown stopped
  // its scope — a `watchEffect` created now is inert: its initial run never fires
  // (the effect is constructed with its active flag cleared, so the scheduled
  // first job bails), so no entry is ever pushed. Nothing will render and there's
  // no live unmount hook to clean up, so return a no-op entry instead of letting
  // `useHead` hand back `undefined` while typed as `ActiveHeadEntry`.
  if (scope && !scope.active) {
    return { patch() {}, dispose() {}, _i: -1 }
  }

  const deactivated = ref(false)

  // Wrap onRendered to preserve the Vue component's effect scope
  if (options.onRendered && scope) {
    const _onRendered = options.onRendered
    options = { ...options, onRendered: ctx => scope.run(() => _onRendered(ctx)) }
  }

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
  const { title, titleTemplate, ...meta } = input
  return useHead({
    title,
    titleTemplate,
    _flatMeta: meta,
  } as UseSeoMetaInput, options)
}

export { useScript } from './scripts/useScript'

/** @deprecated Use `useHead` instead. */
export const useServerHead = useHead
/** @deprecated Use `useHeadSafe` instead. */
export const useServerHeadSafe = useHeadSafe
/** @deprecated Use `useSeoMeta` instead. */
export const useServerSeoMeta = useSeoMeta
