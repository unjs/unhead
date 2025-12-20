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
import { createEffect, createSignal, onCleanup, onMount, useContext } from 'solid-js'
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

function adoptOrCreate<T extends ActiveHeadEntry<any>>(
  head: Unhead,
  input: any,
  options: HeadEntryOptions,
  createFn: (head: Unhead, input: any, options: HeadEntryOptions) => T,
): T {
  // During hydration, adopt streaming entry if available
  const streamEntries = (head as any)._hydrationComplete
    ? undefined
    : (head as any)._streamEntries as Array<T & { _streamKey?: string }> | undefined

  let entry: T
  let isStreamEntry = false

  if (streamEntries?.length) {
    const inputKey = JSON.stringify(input)
    const matchingEntry = streamEntries.find(e => !e._streamKey || e._streamKey === inputKey)

    if (matchingEntry) {
      matchingEntry._streamKey = inputKey
      entry = matchingEntry
      isStreamEntry = true
    }
    else {
      entry = createFn(head, input, options)
    }
  }
  else {
    entry = createFn(head, input, options)
  }

  const [entrySignal] = createSignal<T>(entry)

  // Only patch if not a stream entry (already applied during SSR)
  if (!isStreamEntry) {
    createEffect(() => {
      entrySignal().patch(input)
    }, [input])
  }

  createEffect(() => {
    // Mark hydration complete after first effect runs
    if (isStreamEntry && !(head as any)._hydrationComplete) {
      ;(head as any)._hydrationComplete = true
    }

    return () => {
      // unmount
      entrySignal().dispose()
    }
  }, [])

  return entrySignal()
}

export function useHead(input: UseHeadInput = {}, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput> {
  const head = options.head || useUnhead()
  return adoptOrCreate(head, input, options, baseHead)
}

export function useHeadSafe(input: HeadSafe = {}, options: HeadEntryOptions = {}): ActiveHeadEntry<HeadSafe> {
  const head = options.head || useUnhead()
  return adoptOrCreate<ActiveHeadEntry<HeadSafe>>(head, input, options, baseHeadSafe)
}

export function useSeoMeta(input: UseSeoMetaInput = {}, options: HeadEntryOptions = {}): ActiveHeadEntry<UseSeoMetaInput> {
  const head = options.head || useUnhead()
  return adoptOrCreate<ActiveHeadEntry<UseSeoMetaInput>>(head, input, options, baseSeoMeta)
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
  // Note: we don't remove scripts on unmount as it's not a common use case and reloading the script may be expensive
  const sideEffects: (() => void)[] = []
  onCleanup(() => {
    isMounted = false
    script._triggerAbortController?.abort()
    sideEffects.forEach(i => i())
  })
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
