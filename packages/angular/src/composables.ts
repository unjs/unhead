import type { UseScriptInput, UseScriptOptions, UseScriptReturn } from 'unhead/scripts'
import type { ActiveHeadEntry, HeadEntryOptions, HeadSafe, Unhead, UseHeadInput, UseSeoMetaInput } from 'unhead/types'
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
    mountCbs.forEach(i => i())
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

  const _registerCb = (key: 'loaded' | 'error', cb: any) => {
    let i: number | null
    const destroy = () => {
      // avoid removing the wrong callback
      if (i) {
        script._cbs[key]?.splice(i - 1, 1)
        i = null
      }
    }
    mountCbs.push(() => {
      if (!script._cbs[key]) {
        cb(script.instance)
        return () => {}
      }
      i = script._cbs[key].push(cb)
      sideEffects.push(destroy)
      return destroy
    })
  }

  destroyRef.onDestroy(() => {
    isMounted = false
    script._triggerAbortController?.abort()
    sideEffects.forEach(i => i())
  })
  script.onLoaded = (cb: (instance: T) => void | Promise<void>) => _registerCb('loaded', cb)
  script.onError = (cb: (err?: Error) => void | Promise<void>) => _registerCb('error', cb)
  return script
}
