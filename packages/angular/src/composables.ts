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
    const pending = mountCbs.splice(0)
    pending.forEach(i => i())
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
  const triggerAbortController = script._triggerAbortController

  const _registerCb = (key: 'loaded' | 'error', cb: any) => {
    let active = true
    let registered = false
    const register = () => {
      if (!active)
        return
      if (!script._cbs[key]) {
        cb(script.instance)
        active = false
        return
      }
      script._cbs[key].push(cb)
      registered = true
      sideEffects.push(destroy)
    }
    const destroy = () => {
      if (!active)
        return
      active = false
      const pendingIdx = mountCbs.indexOf(register)
      if (pendingIdx !== -1)
        mountCbs.splice(pendingIdx, 1)
      if (registered) {
        const idx = script._cbs[key]?.indexOf(cb) ?? -1
        if (idx !== -1)
          script._cbs[key]?.splice(idx, 1)
      }
    }
    if (isMounted)
      register()
    else
      mountCbs.push(register)
    return destroy
  }

  destroyRef.onDestroy(() => {
    isMounted = false
    triggerAbortController?.abort()
    sideEffects.forEach(i => i())
  })
  script.onLoaded = (cb: (instance: T) => void | Promise<void>) => _registerCb('loaded', cb)
  script.onError = (cb: (err?: Error) => void | Promise<void>) => _registerCb('error', cb)
  return script
}
