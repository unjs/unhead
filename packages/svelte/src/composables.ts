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

function withSideEffects<T extends ActiveHeadEntry<any>>(head: Unhead, input: any, entry: T): T {
  onDestroy(() => {
    entry.dispose()
  })

  // Mark hydration complete after first component mounts
  if ((head as any)._streamEntries?.length && !(head as any)._hydrationComplete) {
    ;(head as any)._hydrationComplete = true
  }

  return entry
}

function adoptOrCreate<T extends ActiveHeadEntry<any>>(
  head: Unhead,
  input: any,
  options: HeadEntryOptions,
  createFn: (head: Unhead, input: any, options: HeadEntryOptions) => T,
): T {
  // During hydration, adopt streaming entry if available
  const streamEntries = (head as any)._hydrationComplete
    ? undefined
    : (head as any)._streamEntries as Array<T & { _streamKey?: string }> | undefined

  if (streamEntries?.length) {
    const inputKey = JSON.stringify(input)
    const matchingEntry = streamEntries.find(e => !e._streamKey || e._streamKey === inputKey)

    if (matchingEntry) {
      matchingEntry._streamKey = inputKey
      return withSideEffects(head, input, matchingEntry)
    }
  }

  return withSideEffects(head, input, createFn(head, input, options))
}

export function useHead(input: UseHeadInput = {}, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput> {
  const head = options.head || useUnhead()
  return adoptOrCreate(head, input, options, baseHead)
}

export function useHeadSafe(input: HeadSafe = {}, options: HeadEntryOptions = {}): ActiveHeadEntry<HeadSafe> {
  const head = options.head || useUnhead()
  return adoptOrCreate(head, input, options, baseHeadSafe)
}

export function useSeoMeta(input: UseSeoMetaInput = {}, options: HeadEntryOptions = {}): ActiveHeadEntry<UseSeoMetaInput> {
  const head = options.head || useUnhead()
  return adoptOrCreate(head, input, options, baseSeoMeta)
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
