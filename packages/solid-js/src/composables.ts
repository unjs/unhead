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
import { createEffect, createSignal, getOwner, onCleanup, onMount, runWithOwner, useContext } from 'solid-js'
import { isServer } from 'solid-js/web'
import { useHead as baseHead, useHeadSafe as baseHeadSafe, useSeoMeta as baseSeoMeta, useScript as baseUseScript } from 'unhead'
import { UnheadContext } from './context'

export function useUnhead(): Unhead {
  // fallback to solid-js context
  const instance = useContext<Unhead | null>(UnheadContext)
  if (!instance) {
    throw new Error('useHead() was called without provide context.')
  }
  return instance
}

function withSideEffects<T extends ActiveHeadEntry<any>>(input: any, options: any, fn: any): T {
  const unhead = options.head || useUnhead()
  // Wrap onRendered to preserve the Solid reactive owner context
  if (options.onRendered && !isServer) {
    const owner = getOwner()
    if (owner) {
      const _onRendered = options.onRendered
      options = { ...options, onRendered: (ctx: any) => runWithOwner(owner, () => _onRendered(ctx)) }
    }
  }
  const entry = fn(unhead, input, options) as T
  // On client, set up reactive updates and cleanup
  if (!isServer) {
    const [entrySignal] = createSignal<T>(entry)
    createEffect(() => {
      entrySignal().patch(input)
    })
    onCleanup(() => entry.dispose())
  }
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
  let isMounted = false
  onMount(() => {
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
  // Note: we don't remove scripts on unmount as it's not a common use case and reloading the script may be expensive
  const sideEffects: (() => void)[] = []
  onCleanup(() => {
    isMounted = false
    triggerAbortController?.abort()
    sideEffects.forEach(i => i())
  })
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
  // if we have a scope we should make these callbacks reactive
  script.onLoaded = (cb: (instance: T) => void | Promise<void>) => _registerCb('loaded', cb)
  script.onError = (cb: (err?: Error) => void | Promise<void>) => _registerCb('error', cb)
  return script
}
