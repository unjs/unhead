import type { UseScriptReturn } from 'unhead/scripts'
import type {
  ActiveHeadEntry,
  CompatibleHead,
  HeadEntryOptions,
  HeadEntryTarget,
  HeadSafe,
  ResolvableHead,
  Unhead,
  UseHeadInput,
  UseScriptInput,
  UseScriptOptions,
  UseSeoMetaInput,
} from 'unhead/types'
import { getContext, onDestroy, onMount } from 'svelte'
import { useHead as baseHead, useHeadSafe as baseHeadSafe, useSeoMeta as baseSeoMeta } from 'unhead'
import { useScript as baseUseScript } from 'unhead/scripts'
import { UnheadContextKey } from './context'

export function useUnhead(): Unhead {
  const instance = getContext<Unhead>(UnheadContextKey)
  if (!instance) {
    throw new Error('useUnhead() was called without provide context.')
  }
  return instance
}

function withSideEffects<I>(instance: ActiveHeadEntry<I>): ActiveHeadEntry<I> {
  // Only register dispose on client - on server, Svelte runs onDestroy callbacks
  // after render completes which would dispose entries before we can render the head tags
  if (typeof window !== 'undefined') {
    onDestroy(() => {
      instance.dispose()
    })
  }
  return instance
}

type AdapterHeadEntryOptions<I> = Omit<HeadEntryOptions<I>, 'head'> & {
  head?: HeadEntryTarget<I> | HeadEntryTarget<UseHeadInput>
}
type DefaultAdapterHeadEntryOptions = Omit<HeadEntryOptions<UseHeadInput>, 'head'> & { head?: undefined }
type CompatibleAdapterHeadEntryOptions<I, RenderResult> = Omit<HeadEntryOptions<I>, 'head'> & {
  head: CompatibleHead<I, ResolvableHead, RenderResult>
}

export function useHead<I = UseHeadInput>(input: NoInfer<I>, options?: AdapterHeadEntryOptions<I>): ActiveHeadEntry<I>
export function useHead(input?: UseHeadInput, options?: HeadEntryOptions<UseHeadInput>): ActiveHeadEntry<UseHeadInput>
export function useHead<I = UseHeadInput>(input: I = {} as I, options: AdapterHeadEntryOptions<I> = {}): ActiveHeadEntry<I> {
  const head = (options.head || useUnhead()) as Unhead<I>
  return withSideEffects<I>(baseHead(head, input, options as HeadEntryOptions<I>))
}

export function useHeadSafe(input?: HeadSafe, options?: DefaultAdapterHeadEntryOptions): ActiveHeadEntry<HeadSafe>
export function useHeadSafe<HeadInput, RenderResult>(input: HeadSafe, options: CompatibleAdapterHeadEntryOptions<HeadInput, RenderResult>): ActiveHeadEntry<HeadSafe>
export function useHeadSafe<HeadInput = UseHeadInput>(input: HeadSafe = {}, options: AdapterHeadEntryOptions<HeadInput> = {}): ActiveHeadEntry<HeadSafe> {
  const head = (options.head || useUnhead()) as Unhead<HeadInput>
  return withSideEffects(baseHeadSafe(head as unknown as CompatibleHead<HeadInput>, input, options as HeadEntryOptions<HeadInput>))
}

export function useSeoMeta(input?: UseSeoMetaInput, options?: DefaultAdapterHeadEntryOptions): ActiveHeadEntry<UseSeoMetaInput>
export function useSeoMeta<HeadInput, RenderResult>(input: UseSeoMetaInput, options: CompatibleAdapterHeadEntryOptions<HeadInput, RenderResult>): ActiveHeadEntry<UseSeoMetaInput>
export function useSeoMeta<HeadInput = UseHeadInput>(input: UseSeoMetaInput = {}, options: AdapterHeadEntryOptions<HeadInput> = {}): ActiveHeadEntry<UseSeoMetaInput> {
  const head = (options.head || useUnhead()) as Unhead<HeadInput>
  return withSideEffects(baseSeoMeta(head as unknown as CompatibleHead<HeadInput>, input, options as HeadEntryOptions<HeadInput>))
}

export function useScript<T extends object = Record<PropertyKey, unknown>>(_input: UseScriptInput, _options?: Omit<UseScriptOptions<T>, 'scope'>): UseScriptReturn<T> {
  const input = (typeof _input === 'string' ? { src: _input } : _input) as UseScriptInput
  const options = (_options || {}) as UseScriptOptions<T>
  const head = options.head || useUnhead()
  const scriptHead = head as unknown as CompatibleHead<ResolvableHead>
  options.head = scriptHead

  // options.eventContext = scope
  if (typeof options.trigger === 'undefined') {
    options.trigger = load => onMount(() => {
      void load()
    })
  }
  const script = baseUseScript(scriptHead, input, options)
  // capture the controller at registration time so unmount aborts the controller
  // that was active when this component registered, not a newer one
  const triggerAbortController = script._triggerAbortController
  // Note: we don't remove scripts on unmount as it's not a common use case and reloading the script may be expensive
  const sideEffects: (() => void)[] = []
  // core's onLoaded/onError register by identity and return an identity-based
  // disposer; we only tie that disposer to the component lifecycle
  const baseOnLoaded = script.onLoaded
  const baseOnError = script.onError
  script.onLoaded = (cb, eventOptions) => {
    const off = baseOnLoaded(cb, eventOptions)
    sideEffects.push(off)
    return off
  }
  script.onError = (cb, eventOptions) => {
    const off = baseOnError(cb, eventOptions)
    sideEffects.push(off)
    return off
  }
  onDestroy(() => {
    triggerAbortController?.abort()
    sideEffects.forEach(i => i())
  })
  return script
}
