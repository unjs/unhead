import type { UseScriptScopeReturn } from 'unhead/scripts'
import type {
  ActiveHeadEntry,
  EventHandlerOptions,
  HeadEntryOptions,
  HeadSafe,
  Unhead,
  UseHeadInput,
  UseScriptInput,
  UseScriptOptions,
  UseSeoMetaInput,
} from 'unhead/types'
import { createEffect, createSignal, getOwner, onCleanup, onMount, runWithOwner, useContext } from 'solid-js'
import { isServer } from 'solid-js/web'
import { useHead as baseHead, useHeadSafe as baseHeadSafe, useSeoMeta as baseSeoMeta } from 'unhead'
import { useScriptScope as baseUseScriptScope } from 'unhead/scripts'
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

export function useScript<T extends Record<symbol | string, any> = Record<symbol | string, any>>(_input: UseScriptInput, _options?: UseScriptOptions<T>): UseScriptScopeReturn<T> {
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
      return () => {
        const idx = mountCbs.indexOf(load)
        if (idx !== -1)
          mountCbs.splice(idx, 1)
      }
    }
  }
  // @ts-expect-error untyped
  const script = baseUseScriptScope(head, input as BaseUseScriptInput, options)
  // Note: we don't remove scripts on unmount as it's not a common use case and reloading the script may be expensive
  onCleanup(() => {
    isMounted = false
    mountCbs.splice(0)
    script.dispose()
  })
  // core's onLoaded/onError register by identity and return an identity-based
  // disposer; we defer registration to mount and tie the disposer to cleanup
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
  // if we have a scope we should make these callbacks reactive
  script.onLoaded = (cb: (instance: T) => void | Promise<void>, options?: EventHandlerOptions) => _registerCb(() => baseOnLoaded(cb, options))
  script.onError = (cb: (err?: Error) => void | Promise<void>, options?: EventHandlerOptions) => _registerCb(() => baseOnError(cb, options))
  return script
}
