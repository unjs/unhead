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

  // Dead scope (e.g. setup resuming after an await once a Suspense/KeepAlive
  // teardown stopped it): a watchEffect is inert here, so no entry gets pushed.
  // The component is gone, so return a no-op rather than hand back `undefined`.
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

function normalizeSeoMetaInput(input: UseSeoMetaInput) {
  // @ts-expect-error untyped
  if (input._flatMeta)
    return input

  const meta: Record<string, any> = {}
  for (const key in input) {
    if (!Object.hasOwn(input, key) || key === 'title' || key === 'titleTemplate')
      continue
    meta[key] = input[key as keyof UseSeoMetaInput]
  }

  return {
    title: input.title,
    titleTemplate: input.titleTemplate,
    _flatMeta: meta,
  } as UseSeoMetaInput
}

export function useSeoMeta(input: UseSeoMetaInput = {}, options: UseHeadOptions = {}): ActiveHeadEntry<UseSeoMetaInput> {
  const head = options.head || injectHead()
  head.use(FlatMetaPlugin)
  const entry = useHead<UseSeoMetaInput>(normalizeSeoMetaInput(input), options)
  const corePatch = entry.patch
  // @ts-expect-error runtime
  if (!entry.__patched) {
    entry.patch = input => corePatch(normalizeSeoMetaInput(input))
    // @ts-expect-error runtime
    entry.__patched = true
  }
  return entry
}

export { useScript } from './scripts/useScript'

/** @deprecated Use `useHead` instead. */
export const useServerHead = useHead
/** @deprecated Use `useHeadSafe` instead. */
export const useServerHeadSafe = useHeadSafe
/** @deprecated Use `useSeoMeta` instead. */
export const useServerSeoMeta = useSeoMeta
