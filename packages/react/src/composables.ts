import type {
  ActiveHeadEntry,
  EventHandlerOptions,
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

interface ScriptCallbackRecord {
  active: boolean
  handler: any
  invoked: boolean
  key: 'loaded' | 'error'
  off?: () => void
  options?: EventHandlerOptions
  registered: boolean
  renderScoped: boolean
  renderId: number
  script: UseScriptReturn<any>
}

interface ScriptFacade {
  onError: UseScriptReturn<any>['onError']
  onLoaded: UseScriptReturn<any>['onLoaded']
  script: UseScriptReturn<any>
  value: UseScriptReturn<any>
}

/** Create a local callback facade while preserving the shared enumerable API. */
function createScriptFacade(script: UseScriptReturn<any>): ScriptFacade {
  const facade = {
    onError: script.onError,
    onLoaded: script.onLoaded,
    script,
  } as ScriptFacade
  facade.value = new Proxy(script, {
    get(target, key, receiver) {
      if (key === 'onLoaded' || key === 'onError')
        return facade[key]
      return Reflect.get(target, key, receiver)
    },
    getOwnPropertyDescriptor(target, key) {
      const descriptor = Reflect.getOwnPropertyDescriptor(target, key)
      if (descriptor && (key === 'onLoaded' || key === 'onError'))
        return { ...descriptor, value: facade[key] }
      return descriptor
    },
    set(target, key, value, receiver) {
      if (key === 'onLoaded' || key === 'onError') {
        facade[key] = value
        return true
      }
      return Reflect.set(target, key, value, receiver)
    },
  })
  return facade
}

export function useUnhead(): Unhead {
  // fallback to react context
  const instance = useContext<Unhead | null>(UnheadContext)
  if (!instance) {
    throw new Error('useHead() was called without provide context.')
  }
  return instance
}

function withSideEffects<T extends ActiveHeadEntry<any>>(input: any, options: any, fn: any): T {
  const head = options.head || useUnhead()
  const entryRef = useRef<T | null>(null)
  const inputRef = useRef(input)
  inputRef.current = input

  // Server: create entry during render since useEffect doesn't run in SSR
  if (head.ssr && !entryRef.current) {
    entryRef.current = fn(head, input, options) as T
  }

  // Client: create entry in effect to avoid orphaned entries in React 18 StrictMode.
  // StrictMode resets useRef between its double-render invocations,
  // so creating entries during render causes an orphaned entry that never gets disposed.
  useEffect(() => {
    const entry = fn(head, inputRef.current, options) as T
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
    return entryRef.current as T
  }
  const proxyRef = useRef<T | null>(null)
  if (!proxyRef.current) {
    proxyRef.current = {
      patch: (newInput: any) => { entryRef.current?.patch(newInput) },
      dispose: () => {
        entryRef.current?.dispose()
        entryRef.current = null
      },
      _poll: (rm?: boolean) => { (entryRef.current as any)?._poll(rm) },
    } as unknown as T
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
  const head = options.head || useUnhead()
  const trigger = options.trigger
  const resolvedOptions = {
    ...options,
    head,
    trigger: head.ssr && trigger === 'server' ? 'server' : 'manual',
  } as UseScriptOptions<T>

  const callbackRecords = useRef<ScriptCallbackRecord[]>([])
  const scriptFacade = useRef<ScriptFacade | null>(null)
  const isMounted = useRef(false)
  const renderId = useRef(0)
  const committedRenderId = useRef(0)
  const currentRenderId = ++renderId.current

  // @ts-expect-error untyped
  const sharedScript = baseUseScript(head, input as BaseUseScriptInput, resolvedOptions)
  if (!scriptFacade.current || scriptFacade.current.script !== sharedScript)
    scriptFacade.current = createScriptFacade(sharedScript)
  const script = scriptFacade.current.value

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
    if (!record.active || record.invoked || record.registered)
      return
    const off = record.key === 'loaded'
      ? record.script.onLoaded(record.handler, record.options)
      : record.script.onError(record.handler, record.options)
    if (record.active) {
      record.off = off
      record.registered = true
    }
    else {
      off()
    }
  }

  function unregisterScriptCallback(record: ScriptCallbackRecord) {
    if (!record.registered)
      return
    record.off?.()
    record.off = undefined
    record.registered = false
  }

  const _registerCb = (key: 'loaded' | 'error', cb: any, options?: EventHandlerOptions) => {
    const renderScoped = !(isMounted.current && committedRenderId.current === currentRenderId)
    const record: ScriptCallbackRecord = {
      active: true,
      handler: (...args: any[]) => {
        if (!record.active || record.invoked)
          return
        record.invoked = true
        return cb(...args)
      },
      invoked: false,
      key,
      options,
      registered: false,
      renderScoped,
      renderId: currentRenderId,
      script: sharedScript,
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
  scriptFacade.current.onLoaded = (cb: (instance: T) => void | Promise<void>, options?: EventHandlerOptions) => _registerCb('loaded', cb, options)
  scriptFacade.current.onError = (cb: (err?: Error) => void | Promise<void>, options?: EventHandlerOptions) => _registerCb('error', cb, options)
  return script
}
