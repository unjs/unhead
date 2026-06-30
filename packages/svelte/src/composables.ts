import type {
  ActiveHeadEntry,
  HeadEntryOptions,
  HeadSafe,
  Unhead,
  UseHeadInput,
  UseScriptInput,
  UseScriptOptions,
  UseScriptReturn,
  UseSeoMetaInput,
} from 'unhead/types'
import { getContext, onDestroy, onMount } from 'svelte'
import { useHead as baseHead, useHeadSafe as baseHeadSafe, useSeoMeta as baseSeoMeta, useScript as baseUseScript } from 'unhead'
import { UnheadContextKey } from './context'

export function useUnhead(): Unhead {
  const instance = getContext<Unhead>(UnheadContextKey)
  if (!instance) {
    throw new Error('useUnhead() was called without provide context.')
  }
  return instance
}

function withSideEffects<T extends ActiveHeadEntry<any>>(instance: T): T {
  // Only register dispose on client - on server, Svelte runs onDestroy callbacks
  // after render completes which would dispose entries before we can render the head tags
  if (typeof window !== 'undefined') {
    onDestroy(() => {
      instance.dispose()
    })
  }
  return instance
}

export function useHead(input: UseHeadInput = {}, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput> {
  return withSideEffects(baseHead(options.head || useUnhead(), input, options))
}

export function useHeadSafe(input: HeadSafe = {}, options: HeadEntryOptions = {}): ActiveHeadEntry<HeadSafe> {
  return withSideEffects(baseHeadSafe(options.head || useUnhead(), input, options))
}

export function useSeoMeta(input: UseSeoMetaInput = {}, options: HeadEntryOptions = {}): ActiveHeadEntry<UseSeoMetaInput> {
  return withSideEffects(baseSeoMeta(options.head || useUnhead(), input, options))
}

export function useScript<T extends Record<symbol | string, any> = Record<symbol | string, any>>(_input: UseScriptInput, _options?: UseScriptOptions<T>): UseScriptReturn<T> {
  const input = (typeof _input === 'string' ? { src: _input } : _input) as UseScriptInput
  const options = _options || {} as UseScriptOptions<T>
  const head = options?.head || useUnhead()
  options.head = head

  // options.eventContext = scope
  if (typeof options.trigger === 'undefined') {
    options.trigger = onMount
  }
  // @ts-expect-error untyped
  const script = baseUseScript(head, input as BaseUseScriptInput, options)
  // capture the controller at registration time so unmount aborts the controller
  // that was active when this component registered, not a newer one
  const triggerAbortController = script._triggerAbortController
  // Note: we don't remove scripts on unmount as it's not a common use case and reloading the script may be expensive
  const sideEffects: (() => void)[] = []
  // core's onLoaded/onError register by identity and return an identity-based
  // disposer; we only tie that disposer to the component lifecycle
  const bind = (base: (cb: any) => (() => void) | undefined) => (cb: any) => {
    const off = base(cb) ?? (() => {})
    sideEffects.push(off)
    return off
  }
  // core returns an identity-based disposer at runtime although the type says void
  const baseOnLoaded = script.onLoaded as unknown as (cb: any) => (() => void) | undefined
  const baseOnError = script.onError as unknown as (cb: any) => (() => void) | undefined
  // if we have a scope we should make these callbacks reactive
  script.onLoaded = bind(baseOnLoaded)
  script.onError = bind(baseOnError)
  onDestroy(() => {
    // stop any trigger promises
    triggerAbortController?.abort()
    sideEffects.forEach(i => i())
  })
  return script
}
