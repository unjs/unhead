import type { ReactUnhead, ResolvableProperties } from '@unhead/react'
import type {
  DataKeys,
  HeadEntryOptions,
  SchemaAugmentations,
  ScriptBase,
} from '@unhead/schema'
import type { RefObject } from 'react'
import type { UseScriptOptions as BaseUseScriptOptions, ScriptInstance, UseFunctionType, UseScriptStatus } from '../types'
import { useUnhead } from '@unhead/react'
import { useEffect, useRef, useState } from 'react'
import { useScript as _useScript } from '../useScript'

export interface ReactScriptInstance<T extends Record<symbol | string, any>> extends Omit<ScriptInstance<T>, 'status'> {
  status: UseScriptStatus
  _statusRef: RefObject<UseScriptStatus>
}

export type UseScriptInput = string | (ResolvableProperties<Omit<ScriptBase & DataKeys & SchemaAugmentations['script'], 'src'>> & { src: string })

export interface UseScriptOptions<T extends Record<symbol | string, any> = Record<string, any>>
  extends Omit<HeadEntryOptions, 'head'>,
  Pick<BaseUseScriptOptions<T>, 'use' | 'eventContext' | 'beforeInit'> {
  trigger?: BaseUseScriptOptions['trigger'] | RefObject<boolean>
  head?: ReactUnhead<any>
}

export type UseScriptContext<T extends Record<symbol | string, any>> = ReactScriptInstance<T>

export type UseScriptReturn<T extends Record<symbol | string, any>> = UseScriptContext<UseFunctionType<UseScriptOptions<T>, T>>

function initializeScript(
  head: any,
  input: UseScriptInput,
  options: UseScriptOptions,
  statusRef: RefObject<UseScriptStatus>,
  setStatus: (status: UseScriptStatus) => void,
): UseScriptReturn<any> {
  // @ts-expect-error untyped
  head._scriptStatusWatcher = head._scriptStatusWatcher || head.hooks.hook('script:updated', ({ script: s }) => {
    if (s._statusRef) {
      s._statusRef.current = s.status
      setStatus(s.status)
    }
  })

  // @ts-expect-error untyped
  const script = _useScript(head, input, options) as UseScriptReturn
  script._statusRef = statusRef

  return script
}

export function useScript<T extends Record<symbol | string, any> = Record<string, any>>(
  input: UseScriptInput,
  options?: UseScriptOptions<T>,
): UseScriptReturn<T> {
  const headFromContext = useUnhead()
  const opts = options || {} as UseScriptOptions<T>
  const head = opts?.head || headFromContext

  if (!head) {
    throw new Error('No head instance found. Make sure your component is wrapped in UnheadProvider.')
  }

  const [status, setStatus] = useState<UseScriptStatus>('loading')
  const statusRef = useRef<UseScriptStatus>(status)
  const script = initializeScript(head, input, opts, statusRef, setStatus)
  const scriptRef = useRef<UseScriptReturn<T> | null>(script)
  const mountedRef = useRef(false)

  // Handle mount trigger
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // Process trigger based on options or mount state
  const [trigger, setTrigger] = useState(() => {
    if (typeof opts.trigger === 'undefined')
      return false // Wait for mount
    // @ts-expect-error untyped
    if (typeof opts.trigger === 'object' && 'current' in opts.trigger) {
      return opts.trigger.current
    }
    return opts.trigger
  })

  // Keep status ref in sync
  useEffect(() => {
    statusRef.current = status
  }, [status])

  // Handle external trigger updates
  useEffect(() => {
    if (typeof opts.trigger === 'undefined') {
      // Use mounted state as trigger
      setTrigger(isMounted)
    }
    // @ts-expect-error untyped
    else if (typeof opts.trigger === 'object' && 'current' in opts.trigger) {
      // Use ref value as trigger
      if (opts.trigger.current) {
        setTrigger(true)
      }
    }
    else {
      // Use direct trigger value
      setTrigger(!!opts.trigger)
    }
  }, [opts.trigger, isMounted])

  // Main initialization effect
  useEffect(() => {
    mountedRef.current = true
    opts.head = head

    scriptRef.current?._mountCbs?.forEach((cb) => {
      cb(scriptRef.current)
    })

    return () => {
      mountedRef.current = false
      if (scriptRef.current?._triggerAbortController) {
        scriptRef.current._triggerAbortController.abort()
      }
    }
  }, [head, input, trigger])

  const registerCb = (key: 'loaded' | 'error', cb: any) => {
    console.log('registerCb', key, cb)
    if (!script._cbs[key]) {
      script._mountCbs = script._mountCbs || []
      script._mountCbs.push(cb)
      // cb(script.instance)
      return () => {}
    }
    const index = script._cbs[key].push(cb) - 1
    return () => {
      if (script._cbs[key]) {
        script._cbs[key].splice(index, 1)
      }
    }
  }

  script.onLoaded = (cb: (instance: any) => void | Promise<void>) => registerCb('loaded', cb)
  script.onError = (cb: (err?: Error) => void | Promise<void>) => registerCb('error', cb)

  return new Proxy(scriptRef.current || {} as UseScriptReturn<T>, {
    get(target, key, receiver) {
      if (key === 'status')
        return status
      return Reflect.get(target, key, receiver)
    },
  })
}
