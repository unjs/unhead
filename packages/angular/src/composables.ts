import type { ActiveHeadEntry, HeadEntryOptions, HeadSafe, Unhead, UseHeadInput, UseScriptInput, UseScriptOptions, UseScriptReturn, UseSeoMetaInput } from 'unhead/types'
import { DestroyRef, effect, inject } from '@angular/core'
import { useHead as baseHead, useHeadSafe as baseHeadSafe, useSeoMeta as baseSeoMeta, useScript as baseUseScript } from 'unhead'
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

export function useScript<T extends Record<symbol | string, any> = Record<symbol | string, any>>(_input: UseScriptInput, _options?: UseScriptOptions<T>): UseScriptReturn<T> {
  const input = (typeof _input === 'string' ? { src: _input } : _input) as UseScriptInput
  const options = _options || {} as UseScriptOptions<T>
  const head = options?.head || useUnhead()
  options.head = head

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
    }
  }

  // @ts-expect-error untyped
  const script = baseUseScript(head, input as BaseUseScriptInput, options)
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
      if (off) {
        const sideEffectIdx = sideEffects.indexOf(off)
        if (sideEffectIdx !== -1)
          sideEffects.splice(sideEffectIdx, 1)
      }
      off?.()
    }
  }

  destroyRef.onDestroy(() => {
    isMounted = false
    triggerAbortController?.abort()
    sideEffects.forEach(i => i())
  })
  script.onLoaded = (cb: (instance: T) => void | Promise<void>) => _registerCb(() => baseOnLoaded(cb))
  script.onError = (cb: (err?: Error) => void | Promise<void>) => _registerCb(() => baseOnError(cb))
  return script
}
