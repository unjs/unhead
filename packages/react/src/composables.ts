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
  const isStreamEntryRef = useRef(false)

  // Create entry only once, even in Strict Mode
  if (!entryRef.current) {
    // During hydration, adopt streaming entry if available
    // Check _hydrationComplete flag to avoid adopting stale entries after navigation
    const streamEntries = (unhead as any)._hydrationComplete
      ? undefined
      : (unhead as any)._streamEntries as Array<T & { _streamKey?: string }> | undefined

    if (streamEntries?.length) {
      const inputKey = JSON.stringify(input)
      // Find entry matching our input (either unadopted or already adopted by same input)
      const matchingEntry = streamEntries.find(e => !e._streamKey || e._streamKey === inputKey)

      if (matchingEntry) {
        matchingEntry._streamKey = inputKey
        entryRef.current = matchingEntry
        isStreamEntryRef.current = true
      }
      else {
        // No match found - hydration is complete, mark and create fresh
        ;(unhead as any)._hydrationComplete = true
        entryRef.current = fn(unhead, input, options)
      }
    }
    else {
      entryRef.current = fn(unhead, input, options)
    }
  }

  const entry = entryRef.current

  // Patch entry when input changes - skip for stream entries (already applied during SSR)
  useEffect(() => {
    if (!isStreamEntryRef.current) {
      entry?.patch(input)
    }
  }, [input, entry])

  // Mark hydration complete after first effect runs - prevents stale stream entry adoption on navigation
  useEffect(() => {
    if (isStreamEntryRef.current && !(unhead as any)._hydrationComplete) {
      ;(unhead as any)._hydrationComplete = true
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      entry?.dispose()
      entryRef.current = null
    }
  }, [entry])

  return entry as T
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
