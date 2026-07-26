import type { UseScriptReturn } from 'unhead/scripts'
import type {
  ActiveHeadEntry,
  HeadEntryOptions,
  HeadSafe,
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

export function useScript<T extends Record<symbol | string, any> = Record<symbol | string, any>>(_input: UseScriptInput, _options?: Omit<UseScriptOptions<T>, 'scope'>): UseScriptReturn<T> {
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
  // Note: we don't remove scripts on unmount as it's not a common use case and reloading the script may be expensive
  const sideEffects: (() => void)[] = []
  const bind = <A extends any[]>(base: (...args: A) => () => void) => (...args: A) => {
    const off = base(...args)
    sideEffects.push(off)
    return off
  }
  script.onLoaded = bind(script.onLoaded)
  script.onError = bind(script.onError)
  const triggerAbortController = script._triggerAbortController
  onDestroy(() => {
    triggerAbortController?.abort()
    sideEffects.forEach(i => i())
  })
  return script
}
