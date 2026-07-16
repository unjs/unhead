import type {
  ActiveHeadEntry,
  CompatibleHead,
  EventHandlerOptions,
  HeadEntryOptions,
  HeadEntryTarget,
  HeadSafe,
  ResolvableHead,
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

interface ScriptCallbackRecord {
  active: boolean
  off?: () => void
  register: () => () => void
  registered: boolean
  renderScoped: boolean
  renderId: number
}

type ScriptEventRegistrars<T extends object> = Pick<UseScriptReturn<T>, 'onError' | 'onLoaded'>
type ReactScript<T extends object> = UseScriptReturn<T> & { _reactRegistrars?: ScriptEventRegistrars<T> }

export function useUnhead(): Unhead {
  // fallback to react context
  const instance = useContext<Unhead | null>(UnheadContext)
  if (!instance) {
    throw new Error('useHead() was called without provide context.')
  }
  return instance
}

type AdapterHeadEntryOptions<I> = Omit<HeadEntryOptions<I>, 'head'> & {
  head?: HeadEntryTarget<I> | HeadEntryTarget<UseHeadInput>
}
type DefaultAdapterHeadEntryOptions = Omit<HeadEntryOptions<UseHeadInput>, 'head'> & { head?: undefined }
type CompatibleAdapterHeadEntryOptions<I, RenderResult> = Omit<HeadEntryOptions<I>, 'head'> & {
  head: CompatibleHead<I, ResolvableHead, RenderResult>
}
type HeadComposable<Input, HeadInput> = (head: Unhead<HeadInput>, input: Input, options: HeadEntryOptions<HeadInput>) => ActiveHeadEntry<Input>
type PollableHeadEntry<I> = ActiveHeadEntry<I> & { _poll?: (remove?: boolean) => void }

function withSideEffects<Input, HeadInput>(input: Input, options: AdapterHeadEntryOptions<HeadInput>, fn: HeadComposable<Input, HeadInput>): ActiveHeadEntry<Input> {
  const head = (options.head || useUnhead()) as Unhead<HeadInput>
  const entryOptions = options as HeadEntryOptions<HeadInput>
  const entryRef = useRef<ActiveHeadEntry<Input> | null>(null)
  const inputRef = useRef(input)
  inputRef.current = input

  // Server: create entry during render since useEffect doesn't run in SSR
  if (head.ssr && !entryRef.current) {
    entryRef.current = fn(head, input, entryOptions)
  }

  // Client: create entry in effect to avoid orphaned entries in React 18 StrictMode.
  // StrictMode resets useRef between its double-render invocations,
  // so creating entries during render causes an orphaned entry that never gets disposed.
  useEffect(() => {
    const entry = fn(head, inputRef.current, entryOptions)
    entryRef.current = entry
    return () => {
      entry.dispose()
      entryRef.current = null
    }
  }, [head])

  // Patch when input changes
  useEffect(() => {
    entryRef.current?.patch(input)
  }, [input])

  // Return a stable proxy that delegates to the real entry once created
  if (head.ssr) {
    return entryRef.current!
  }
  const proxyRef = useRef<PollableHeadEntry<Input> | null>(null)
  if (!proxyRef.current) {
    proxyRef.current = {
      patch: (newInput: Input) => { entryRef.current?.patch(newInput) },
      dispose: () => {
        entryRef.current?.dispose()
        entryRef.current = null
      },
      _poll: (rm?: boolean) => { (entryRef.current as PollableHeadEntry<Input> | null)?._poll?.(rm) },
    } as PollableHeadEntry<Input>
  }
  return proxyRef.current
}

export function useHead<I = UseHeadInput>(input: NoInfer<I>, options?: AdapterHeadEntryOptions<I>): ActiveHeadEntry<I>
export function useHead(input?: UseHeadInput, options?: HeadEntryOptions<UseHeadInput>): ActiveHeadEntry<UseHeadInput>
export function useHead<I = UseHeadInput>(input: I = {} as I, options: AdapterHeadEntryOptions<I> = {}): ActiveHeadEntry<I> {
  return withSideEffects(input, options, baseHead as HeadComposable<I, I>)
}

export function useHeadSafe(input?: HeadSafe, options?: DefaultAdapterHeadEntryOptions): ActiveHeadEntry<HeadSafe>
export function useHeadSafe<HeadInput, RenderResult>(input: HeadSafe, options: CompatibleAdapterHeadEntryOptions<HeadInput, RenderResult>): ActiveHeadEntry<HeadSafe>
export function useHeadSafe<HeadInput = UseHeadInput>(input: HeadSafe = {}, options: AdapterHeadEntryOptions<HeadInput> = {}): ActiveHeadEntry<HeadSafe> {
  return withSideEffects<HeadSafe, HeadInput>(input, options, baseHeadSafe as unknown as HeadComposable<HeadSafe, HeadInput>)
}

export function useSeoMeta(input?: UseSeoMetaInput, options?: DefaultAdapterHeadEntryOptions): ActiveHeadEntry<UseSeoMetaInput>
export function useSeoMeta<HeadInput, RenderResult>(input: UseSeoMetaInput, options: CompatibleAdapterHeadEntryOptions<HeadInput, RenderResult>): ActiveHeadEntry<UseSeoMetaInput>
export function useSeoMeta<HeadInput = UseHeadInput>(input: UseSeoMetaInput = {}, options: AdapterHeadEntryOptions<HeadInput> = {}): ActiveHeadEntry<UseSeoMetaInput> {
  return withSideEffects<UseSeoMetaInput, HeadInput>(input, options, baseSeoMeta as unknown as HeadComposable<UseSeoMetaInput, HeadInput>)
}

export function useScript<T extends object = Record<PropertyKey, unknown>>(_input: UseScriptInput, _options: UseScriptOptions<T> = {}): UseScriptReturn<T> {
  const input = (typeof _input === 'string' ? { src: _input } : _input) as UseScriptInput
  const options = _options as UseScriptOptions<T>
  const head = options.head || useUnhead()
  const scriptHead = head as unknown as CompatibleHead<ResolvableHead>
  const trigger = options.trigger
  const resolvedOptions = {
    ...options,
    head: scriptHead,
    trigger: head.ssr && trigger === 'server' ? 'server' : 'manual',
  } as UseScriptOptions<T>

  const callbackRecords = useRef<ScriptCallbackRecord[]>([])
  const isMounted = useRef(false)
  const renderId = useRef(0)
  const committedRenderId = useRef(0)
  const currentRenderId = ++renderId.current

  const script = baseUseScript(scriptHead, input, resolvedOptions)

  useEffect(() => {
    isMounted.current = true
    committedRenderId.current = currentRenderId
    reconcileScriptCallbacks(currentRenderId)
    callbackRecords.current.forEach(registerScriptCallback)
    return () => {
      isMounted.current = false
      callbackRecords.current.forEach(unregisterScriptCallback)
    }
  })

  useEffect(() => {
    const existingControllers = new Set(script._triggerAbortControllers)
    script.setupTriggerHandler(trigger)
    const triggerAbortControllers = script._triggerAbortControllers
      ? [...script._triggerAbortControllers].filter(controller => !existingControllers.has(controller))
      : []

    return () => {
      triggerAbortControllers.forEach(controller => controller.abort())
    }
  }, [script, trigger])

  function reconcileScriptCallbacks(activeRenderId: number) {
    callbackRecords.current.forEach((record) => {
      if (record.renderScoped && record.renderId !== activeRenderId) {
        record.active = false
        unregisterScriptCallback(record)
      }
    })
    callbackRecords.current = callbackRecords.current.filter(record => record.active && (!record.renderScoped || record.renderId === activeRenderId))
  }

  function registerScriptCallback(record: ScriptCallbackRecord) {
    if (!record.active || record.registered)
      return
    record.registered = true
    record.off = record.register()
  }

  function unregisterScriptCallback(record: ScriptCallbackRecord) {
    if (!record.registered)
      return
    record.off?.()
    record.off = undefined
    record.registered = false
  }

  const _registerCb = <Args extends unknown[]>(
    register: (cb: (...args: Args) => void | Promise<void>, options?: EventHandlerOptions) => () => void,
    cb: (...args: Args) => void | Promise<void>,
    eventOptions?: EventHandlerOptions,
  ) => {
    const renderScoped = !(isMounted.current && committedRenderId.current === currentRenderId)
    let record: ScriptCallbackRecord
    const handler = (...args: Args) => {
      if (!record.active)
        return
      record.active = false
      record.registered = false
      return cb(...args)
    }
    record = {
      active: true,
      register: () => register(handler, eventOptions),
      registered: false,
      renderScoped,
      renderId: currentRenderId,
    }
    callbackRecords.current.push(record)
    if (isMounted.current && committedRenderId.current === currentRenderId)
      registerScriptCallback(record)
    return destroy

    function destroy() {
      if (!record.active)
        return
      record.active = false
      unregisterScriptCallback(record)
      const idx = callbackRecords.current.indexOf(record)
      if (idx !== -1)
        callbackRecords.current.splice(idx, 1)
    }
  }
  // if we have a scope we should make these callbacks reactive
  const reactScript = script as ReactScript<T>
  const registrars = reactScript._reactRegistrars ||= {
    onLoaded: script.onLoaded,
    onError: script.onError,
  }
  script.onLoaded = (cb, eventOptions) => _registerCb(registrars.onLoaded, cb, eventOptions)
  script.onError = (cb, eventOptions) => _registerCb(registrars.onError, cb, eventOptions)
  return script
}
