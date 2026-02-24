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
import { useContext, useEffect, useRef } from 'react'
import { useHead as baseHead, useHeadSafe as baseHeadSafe, useSeoMeta as baseSeoMeta, useScript as baseUseScript } from 'unhead'
import { UnheadContext } from './context'

export function useUnhead(): Unhead {
  // fallback to react context
  const instance = useContext<Unhead | null>(UnheadContext)
  if (!instance) {
    throw new Error('useHead() was called without provide context.')
  }
  return instance
}

function withSideEffects<T extends ActiveHeadEntry<any>>(input: any, options: any, fn: any): T {
  const unhead = options.head || useUnhead()
  const entryRef = useRef<T | null>(null)
  const inputRef = useRef(input)
  inputRef.current = input

  // Create entry in effect to avoid orphaned entries in React 18 StrictMode.
  // React 18 StrictMode resets useRef between its double-render invocations,
  // so creating entries during render causes an orphaned entry that never gets disposed.
  useEffect(() => {
    const entry = fn(unhead, inputRef.current, options) as T
    entryRef.current = entry
    return () => {
      entry.dispose()
      entryRef.current = null
    }
  }, [unhead])

  // Patch when input changes
  useEffect(() => {
    entryRef.current?.patch(input)
  }, [input])

  // Return a stable proxy that delegates to the real entry once created
  const proxyRef = useRef<T | null>(null)
  if (!proxyRef.current) {
    proxyRef.current = {
      patch: (newInput: any) => { entryRef.current?.patch(newInput) },
      dispose: () => {
        entryRef.current?.dispose()
        entryRef.current = null
      },
      _poll: (rm?: boolean) => { entryRef.current?._poll(rm) },
    } as T
  }
  return proxyRef.current
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
  useEffect(() => {
    isMounted = true
    mountCbs.forEach(i => i())
    return () => {
      isMounted = false
    }
  }, [])

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
  // Note: we don't remove scripts on unmount as it's not a common use case and reloading the script may be expensive
  const sideEffects: (() => void)[] = []
  useEffect(() => {
    return () => {
      script._triggerAbortController?.abort()
      sideEffects.forEach(i => i())
    }
  }, [])
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
  // if we have a scope we should make these callbacks reactive
  script.onLoaded = (cb: (instance: T) => void | Promise<void>) => _registerCb('loaded', cb)
  script.onError = (cb: (err?: Error) => void | Promise<void>) => _registerCb('error', cb)
  return script
}
