import type { EntryOptions } from 'unhead/v4'
import type {
  ActiveHeadEntry,
  UseHeadInput,
  UseHeadOptions,
  UseHeadSafeInput,
  UseSeoMetaInput,
  VueHeadClient,
} from './types'
import { walkResolver } from 'unhead/utils'
import { unpackSeoMetaInput } from 'unhead/v4/seo'
import {
  getCurrentInstance,
  getCurrentScope,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  ref,
  watchEffect,
} from 'vue'
import { VueResolver } from '../resolver'
import { injectHead } from './install'
import { sanitizeSafeInput } from './safe'

export { injectHead } from './install'

type Transform = (input: Record<string, any>) => Record<string, any>

const identityTransform: Transform = i => i

function _useHead(input: unknown, options: UseHeadOptions, transform: Transform): ActiveHeadEntry<any> {
  const head = options.head || injectHead()
  const opts: EntryOptions = { tagPriority: options.tagPriority, tagPosition: options.tagPosition }
  // v4 core refuses refs and getters in tag values by contract; the adapter
  // resolves them (walkResolver + VueResolver) before anything reaches L1
  const resolve = (i: unknown) => transform(walkResolver(i, VueResolver) || {})
  if (head.ssr) {
    // push a thunk: the compiler unwraps function input at resolve() time, so
    // refs assigned after push (async setup) still render their final value,
    // matching v3's deferred prop resolution
    const entry = head.push(() => resolve(input), opts)
    return {
      patch: next => entry.patch(() => resolve(next)),
      dispose: entry.dispose,
    }
  }
  return clientUseHead(head, input, opts, resolve)
}

function clientUseHead(head: VueHeadClient, input: unknown, opts: EntryOptions, resolve: (i: unknown) => Record<string, any>): ActiveHeadEntry<any> {
  const scope = getCurrentScope()

  // Dead scope (e.g. setup resuming after an await once a Suspense/KeepAlive
  // teardown stopped it): a watchEffect is inert here, so no entry gets pushed.
  // The component is gone, so return a no-op rather than hand back `undefined`.
  if (scope && !scope.active)
    return { patch() {}, dispose() {}, _i: -1 }

  const deactivated = ref(false)

  let entry: ReturnType<VueHeadClient['push']> | undefined
  watchEffect(() => {
    const i = deactivated.value ? {} : resolve(input)
    entry ? entry.patch(i) : (entry = head.push(i, opts))
  })

  const vm = getCurrentInstance()
  if (vm) {
    onBeforeUnmount(() => {
      entry!.dispose()
    })
    onDeactivated(() => {
      deactivated.value = true
    })
    onActivated(() => {
      deactivated.value = false
    })
  }
  return {
    patch: next => entry!.patch(resolve(next)),
    dispose: () => entry!.dispose(),
  }
}

export function useHead(input?: UseHeadInput, options: UseHeadOptions = {}): ActiveHeadEntry<UseHeadInput> {
  return _useHead(input || {}, options, identityTransform)
}

export function useHeadSafe(input: UseHeadSafeInput = {}, options: UseHeadOptions = {}): ActiveHeadEntry<UseHeadSafeInput> {
  return _useHead(input, options, sanitizeSafeInput)
}

export function useSeoMeta(input: UseSeoMetaInput = {}, options: UseHeadOptions = {}): ActiveHeadEntry<UseSeoMetaInput> {
  return _useHead(input, options, unpackSeoMetaInput)
}

/** @deprecated Use `useHead` instead. */
export const useServerHead = useHead
/** @deprecated Use `useHeadSafe` instead. */
export const useServerHeadSafe = useHeadSafe
/** @deprecated Use `useSeoMeta` instead. */
export const useServerSeoMeta = useSeoMeta
