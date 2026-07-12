import type { ActiveHeadEntry, CompatibleHead, HeadEntryOptions, Unhead } from 'unhead/types'
import type {
  ReactiveHead,
  UseHeadInput,
  UseHeadOptions,
  UseHeadSafeInput,
  UseSeoMetaInput,
} from './types'
import { FlatMetaPlugin, SafeInputPlugin } from 'unhead/plugins'
import { walkResolver } from 'unhead/utils'
import {
  getCurrentInstance,
  getCurrentScope,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  ref,
  watchEffect,
} from 'vue'
import { injectHead } from './install'
import { VueResolver } from './resolver'

export { injectHead } from './install'

type CompatibleUseHeadOptions<I, RenderResult> = Omit<UseHeadOptions<I>, 'head'> & {
  head: CompatibleHead<I, ReactiveHead, RenderResult>
}
type DefaultUseHeadOptions = Omit<UseHeadOptions, 'head'> & { head?: undefined }

export function useHead<I = UseHeadInput>(input: NoInfer<I>, options?: UseHeadOptions<I>): ActiveHeadEntry<I>
export function useHead(input?: UseHeadInput, options?: UseHeadOptions): ActiveHeadEntry<UseHeadInput>
export function useHead<I = UseHeadInput>(input?: I, options: UseHeadOptions<I> = {}): ActiveHeadEntry<I> {
  const resolvedInput = arguments.length ? input as I : {} as I
  const head = (options.head || injectHead()) as Unhead<I>
  const entryOptions = options as HeadEntryOptions<I>
  const entry = head.ssr
    ? head.push(resolvedInput, entryOptions)
    : clientUseHead(head, resolvedInput, entryOptions)
  return entry
}

function clientUseHead<I = UseHeadInput>(head: Unhead<I>, input: I, options: HeadEntryOptions<I> = {}): ActiveHeadEntry<I> {
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
    const i = (deactivated.value ? {} : walkResolver(input, VueResolver)) as I
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

export function useHeadSafe(input?: UseHeadSafeInput, options?: DefaultUseHeadOptions): ActiveHeadEntry<UseHeadSafeInput>
export function useHeadSafe<HeadInput, RenderResult>(input: UseHeadSafeInput, options: CompatibleUseHeadOptions<HeadInput, RenderResult>): ActiveHeadEntry<UseHeadSafeInput>
export function useHeadSafe<HeadInput = UseHeadInput>(input: UseHeadSafeInput = {}, options: UseHeadOptions<HeadInput> = {}): ActiveHeadEntry<UseHeadSafeInput> {
  const head = (options.head || injectHead()) as Unhead<HeadInput>
  head.use(SafeInputPlugin)
  options._safe = true
  return useHead<HeadInput>(input as unknown as HeadInput, options) as unknown as ActiveHeadEntry<UseHeadSafeInput>
}

function normalizeSeoMetaInput(input: UseSeoMetaInput) {
  if ('_flatMeta' in input)
    return input

  const meta: Record<string, unknown> = {}
  for (const key in input) {
    if (!Object.hasOwn(input, key) || key === 'title' || key === 'titleTemplate')
      continue
    meta[key] = input[key as keyof UseSeoMetaInput]
  }

  return {
    title: input.title,
    titleTemplate: input.titleTemplate,
    _flatMeta: meta,
  }
}

export function useSeoMeta(input?: UseSeoMetaInput, options?: DefaultUseHeadOptions): ActiveHeadEntry<UseSeoMetaInput>
export function useSeoMeta<HeadInput, RenderResult>(input: UseSeoMetaInput, options: CompatibleUseHeadOptions<HeadInput, RenderResult>): ActiveHeadEntry<UseSeoMetaInput>
export function useSeoMeta<HeadInput = UseHeadInput>(input: UseSeoMetaInput = {}, options: UseHeadOptions<HeadInput> = {}): ActiveHeadEntry<UseSeoMetaInput> {
  const head = (options.head || injectHead()) as Unhead<HeadInput>
  head.use(FlatMetaPlugin)
  const entry = useHead<HeadInput>(normalizeSeoMetaInput(input) as unknown as HeadInput, options) as unknown as ActiveHeadEntry<UseSeoMetaInput> & { __patched?: boolean }
  const corePatch = entry.patch
  if (!entry.__patched) {
    entry.patch = input => corePatch(normalizeSeoMetaInput(input))
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
