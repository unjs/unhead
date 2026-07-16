import type { UseScriptScopeReturn } from 'unhead/scripts'
import type { ActiveHeadEntry, EventHandlerOptions, HeadEntryOptions, HeadSafe, Unhead, UseHeadInput, UseScriptInput, UseScriptOptions, UseSeoMetaInput } from 'unhead/types'
import { DestroyRef, effect, inject } from '@angular/core'
import { useHead as baseHead, useHeadSafe as baseHeadSafe, useSeoMeta as baseSeoMeta } from 'unhead'
import { useScriptScope as baseUseScriptScope } from 'unhead/scripts'
import { UnheadInjectionToken } from './context'

export function useUnhead() {
  const instance = inject<Unhead>(UnheadInjectionToken)
  if (!instance) {
    throw new Error('useHead() was called without proper injection context.')
  }
  return instance
}

function withSideEffects<T extends ActiveHeadEntry<any>>(input: any, options: any, fn: any): T {
  const head = options.head || useUnhead()
  const entry = fn(head, input, options)

  const destroyRef = inject(DestroyRef)
  destroyRef.onDestroy(() => {
    entry.dispose()
  })

  return entry
}

export function useHead(input: UseHeadInput = {}, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput> {
  return withSideEffects(input, options, baseHead)
}

export function useHeadSafe(input: HeadSafe = {}, options: HeadEntryOptions = {}): ActiveHeadEntry<HeadSafe> {
  return withSideEffects<ActiveHeadEntry<HeadSafe>>(input, options, baseHeadSafe)
}

export function useSeoMeta(input: UseSeoMetaInput = {}, options: HeadEntryOptions = {}): ActiveHeadEntry<UseSeoMetaInput> {
  return withSideEffects<ActiveHeadEntry<UseSeoMetaInput>>(input, options, baseSeoMeta)
}

export function useScript<T extends Record<symbol | string, any> = Record<symbol | string, any>>(_input: UseScriptInput, _options?: UseScriptOptions<T>): UseScriptScopeReturn<T> {
  const input = (typeof _input === 'string' ? { src: _input } : _input) as UseScriptInput
  const options = _options || {} as UseScriptOptions<T>
  const head = options?.head || useUnhead()
  options.head = head

  const mountCbs: (() => void)[] = []
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

  // @ts-expect-error untyped
  const script = baseUseScriptScope(head, input as BaseUseScriptInput, options)

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
    script.dispose()
  })
  script.onLoaded = (cb: (instance: T) => void | Promise<void>, options?: EventHandlerOptions) => _registerCb(() => baseOnLoaded(cb, options))
  script.onError = (cb: (err?: Error) => void | Promise<void>, options?: EventHandlerOptions) => _registerCb(() => baseOnError(cb, options))
  return script
}
