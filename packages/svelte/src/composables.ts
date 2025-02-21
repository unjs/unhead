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
  onDestroy(() => {
    instance.dispose()
  })
  return instance
}

export function useHead(input: UseHeadInput = {}, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput> {
  // @ts-expect-error untyped
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
  // Note: we don't remove scripts on unmount as it's not a common use case and reloading the script may be expensive
  const sideEffects: (() => void)[] = []
  const _registerCb = (key: 'loaded' | 'error', cb: any) => {
    if (!script._cbs[key]) {
      cb(script.instance)
      return () => {}
    }
    let i: number | null = script._cbs[key].push(cb)
    const destroy = () => {
      // avoid removing the wrong callback
      if (i) {
        script._cbs[key]?.splice(i - 1, 1)
        i = null
      }
    }
    sideEffects.push(destroy)
    return destroy
  }
  // if we have a scope we should make these callbacks reactive
  script.onLoaded = (cb: (instance: T) => void | Promise<void>) => _registerCb('loaded', cb)
  script.onError = (cb: (err?: Error) => void | Promise<void>) => _registerCb('error', cb)
  onDestroy(() => {
    // stop any trigger promises
    script._triggerAbortController?.abort()
    sideEffects.forEach(i => i())
  })
  return script
}
