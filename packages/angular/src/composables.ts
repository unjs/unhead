import type { UseScriptReturn } from 'unhead/scripts'
import type { ActiveHeadEntry, CompatibleHead, HeadEntryOptions, HeadEntryTarget, HeadSafe, ResolvableHead, Unhead, UseHeadInput, UseScriptInput, UseScriptOptions, UseSeoMetaInput } from 'unhead/types'
import { DestroyRef, effect, inject } from '@angular/core'
import { useHead as baseHead, useHeadSafe as baseHeadSafe, useSeoMeta as baseSeoMeta } from 'unhead'
import { useScript as baseUseScript } from 'unhead/scripts'
import { UnheadInjectionToken } from './context'

export function useUnhead() {
  const instance = inject(UnheadInjectionToken)
  if (!instance) {
    throw new Error('useHead() was called without proper injection context.')
  }
  return instance as unknown as Unhead
}

type AdapterHeadEntryOptions<I> = Omit<HeadEntryOptions<I>, 'head'> & {
  head?: HeadEntryTarget<I> | HeadEntryTarget<UseHeadInput>
}
type DefaultAdapterHeadEntryOptions = Omit<HeadEntryOptions<UseHeadInput>, 'head'> & { head?: undefined }
type CompatibleAdapterHeadEntryOptions<I, RenderResult> = Omit<HeadEntryOptions<I>, 'head'> & {
  head: CompatibleHead<I, ResolvableHead, RenderResult>
}
type HeadComposable<Input, HeadInput> = (head: Unhead<HeadInput>, input: Input, options: HeadEntryOptions<HeadInput>) => ActiveHeadEntry<Input>

function withSideEffects<Input, HeadInput>(input: Input, options: AdapterHeadEntryOptions<HeadInput>, fn: HeadComposable<Input, HeadInput>): ActiveHeadEntry<Input> {
  const head = (options.head || useUnhead()) as Unhead<HeadInput>
  const entry = fn(head, input, options as HeadEntryOptions<HeadInput>)

  const destroyRef = inject(DestroyRef)
  destroyRef.onDestroy(() => {
    entry.dispose()
  })

  return entry
}

export function useHead<I = UseHeadInput>(input: NoInfer<I>, options?: AdapterHeadEntryOptions<I>): ActiveHeadEntry<I>
export function useHead(input?: UseHeadInput, options?: HeadEntryOptions<UseHeadInput>): ActiveHeadEntry<UseHeadInput>
export function useHead<I = UseHeadInput>(input: I = {} as I, options: AdapterHeadEntryOptions<I> = {}): ActiveHeadEntry<I> {
  return withSideEffects(input, options, (head, value, entryOptions) => baseHead(head, value, entryOptions))
}

export function useHeadSafe(input?: HeadSafe, options?: DefaultAdapterHeadEntryOptions): ActiveHeadEntry<HeadSafe>
export function useHeadSafe<HeadInput, RenderResult>(input: HeadSafe, options: CompatibleAdapterHeadEntryOptions<HeadInput, RenderResult>): ActiveHeadEntry<HeadSafe>
export function useHeadSafe<HeadInput = UseHeadInput>(input: HeadSafe = {}, options: AdapterHeadEntryOptions<HeadInput> = {}): ActiveHeadEntry<HeadSafe> {
  return withSideEffects<HeadSafe, HeadInput>(input, options, (head, value, entryOptions) => baseHeadSafe(head as unknown as CompatibleHead<HeadInput>, value, entryOptions))
}

export function useSeoMeta(input?: UseSeoMetaInput, options?: DefaultAdapterHeadEntryOptions): ActiveHeadEntry<UseSeoMetaInput>
export function useSeoMeta<HeadInput, RenderResult>(input: UseSeoMetaInput, options: CompatibleAdapterHeadEntryOptions<HeadInput, RenderResult>): ActiveHeadEntry<UseSeoMetaInput>
export function useSeoMeta<HeadInput = UseHeadInput>(input: UseSeoMetaInput = {}, options: AdapterHeadEntryOptions<HeadInput> = {}): ActiveHeadEntry<UseSeoMetaInput> {
  return withSideEffects<UseSeoMetaInput, HeadInput>(input, options, (head, value, entryOptions) => baseSeoMeta(head as unknown as CompatibleHead<HeadInput>, value, entryOptions))
}

export function useScript<T extends object = Record<PropertyKey, unknown>>(_input: UseScriptInput, _options?: Omit<UseScriptOptions<T>, 'scope'>): UseScriptReturn<T> {
  const input = (typeof _input === 'string' ? { src: _input } : _input) as UseScriptInput
  const options = (_options || {}) as UseScriptOptions<T>
  const head = options.head || useUnhead()
  const scriptHead = head as unknown as CompatibleHead<ResolvableHead>
  options.head = scriptHead

  const mountCbs: (() => void)[] = []
  const sideEffects: (() => void)[] = []
  let isMounted = false

  const destroyRef = inject(DestroyRef)

  effect(() => {
    isMounted = true
    // drain so a re-invoked effect does not run the same callback twice
    mountCbs.splice(0).forEach(i => i())
  })

  if (typeof options.trigger === 'undefined') {
    options.trigger = (load) => {
      if (isMounted) {
        load()
      }
      else {
        mountCbs.push(load)
      }
      return () => {
        const idx = mountCbs.indexOf(load)
        if (idx !== -1)
          mountCbs.splice(idx, 1)
      }
    }
  }

  const script = baseUseScript(scriptHead, input, options)
  // capture the controller at registration time so destroy aborts the controller
  // that was active when this component registered, not a newer one
  const triggerAbortController = script._triggerAbortController

  // core's onLoaded/onError register by identity and return an identity-based
  // disposer; we defer registration to mount and tie the disposer to destroy
  const baseOnLoaded = script.onLoaded
  const baseOnError = script.onError
  const _registerCb = (register: () => () => void) => {
    let disposed = false
    let off: (() => void) | undefined
    const run = () => {
      if (disposed)
        return
      off = register()
      sideEffects.push(off)
    }
    if (isMounted)
      run()
    else
      mountCbs.push(run)
    return () => {
      if (disposed)
        return
      disposed = true
      const idx = mountCbs.indexOf(run)
      if (idx !== -1)
        mountCbs.splice(idx, 1)
      off?.()
    }
  }

  destroyRef.onDestroy(() => {
    isMounted = false
    mountCbs.splice(0)
    triggerAbortController?.abort()
    sideEffects.forEach(i => i())
  })
  script.onLoaded = (cb, eventOptions) => _registerCb(() => baseOnLoaded(cb, eventOptions))
  script.onError = (cb, eventOptions) => _registerCb(() => baseOnError(cb, eventOptions))
  return script
}
