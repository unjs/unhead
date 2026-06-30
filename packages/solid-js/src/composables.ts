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
    // createEffect does not treat a returned function as cleanup, so the entry
    // was never disposed; onCleanup runs when the owning root is disposed
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
    // drain so callbacks registered before mount run exactly once
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
  // capture the controller at registration time so cleanup aborts the controller
  // that was active when this owner registered, not a newer one
  const triggerAbortController = script._triggerAbortController
  // Note: we don't remove scripts on unmount as it's not a common use case and reloading the script may be expensive
  const sideEffects: (() => void)[] = []
  onCleanup(() => {
    isMounted = false
    triggerAbortController?.abort()
    sideEffects.forEach(i => i())
  })
  // core's onLoaded/onError register by identity and return an identity-based
  // disposer; we defer registration to mount and tie the disposer to cleanup
  // core returns an identity-based disposer at runtime although the type says void
  const baseOnLoaded = script.onLoaded as unknown as (cb: any) => (() => void) | undefined
  const baseOnError = script.onError as unknown as (cb: any) => (() => void) | undefined
  const _registerCb = (register: () => (() => void) | undefined) => {
    let disposed = false
    let off: (() => void) | undefined
    const run = () => {
      if (disposed)
        return
      off = register() ?? (() => {})
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
  // if we have a scope we should make these callbacks reactive
  script.onLoaded = (cb: (instance: T) => void | Promise<void>) => _registerCb(() => baseOnLoaded(cb))
  script.onError = (cb: (err?: Error) => void | Promise<void>) => _registerCb(() => baseOnError(cb))
  return script
}
