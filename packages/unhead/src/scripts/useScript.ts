import type {
  RawInput,
  Unhead,
} from '../types'
import type {
  EventHandlerOptions,
  ScriptInstance,
  ScriptScope,
  UseFunctionType,
  UseScriptContext,
  UseScriptContextOptions,
  UseScriptInput,
  UseScriptOptions,
  UseScriptResolvedInput,
  UseScriptReturn,
  UseScriptScopeReturn,
  WarmupStrategy,
} from './types'
import { callHook } from '../utils/hooks'
import { createForwardingProxy, createNoopedRecordingProxy, replayProxyRecordings } from './proxy'
import { createScriptScope } from './scope'
import { createScriptWaitFor } from './waitFor'

/**
 * Load third-party scripts with SSR support and a proxied API.
 *
 * @see https://unhead.unjs.io/usage/composables/use-script
 */
type ScriptApi = Record<symbol | string, any>
type ResolveScriptOptions<R> = Omit<UseScriptOptions<any>, 'resolve' | 'use'> & { resolve: (ctx: UseScriptContextOptions) => R, use?: never }
type ResolvedScriptApi<R> = Extract<NonNullable<Awaited<R>>, ScriptApi>

export function useScript<R>(head: Unhead<any>, _input: UseScriptInput, _options: ResolveScriptOptions<R> & { scope: true }): ScriptScope<ResolvedScriptApi<R>>
export function useScript<R>(head: Unhead<any>, _input: UseScriptInput, _options: ResolveScriptOptions<R> & { scope?: false }): ScriptInstance<ResolvedScriptApi<R>>
export function useScript<R>(head: Unhead<any>, _input: UseScriptInput, _options: ResolveScriptOptions<R>): ScriptInstance<ResolvedScriptApi<R>> | ScriptScope<ResolvedScriptApi<R>>
export function useScript<T extends Record<symbol | string, any> = Record<symbol | string, any>>(head: Unhead<any>, _input: UseScriptInput, _options: UseScriptOptions<T> & { scope: true }): UseScriptScopeReturn<T>
export function useScript<T extends Record<symbol | string, any> = Record<symbol | string, any>>(head: Unhead<any>, _input: UseScriptInput, _options?: UseScriptOptions<T> & { scope?: false }): UseScriptReturn<T>
export function useScript<T extends Record<symbol | string, any> = Record<symbol | string, any>>(head: Unhead<any>, _input: UseScriptInput, _options?: UseScriptOptions<T>): UseScriptReturn<T> | UseScriptScopeReturn<T>
export function useScript<T extends Record<symbol | string, any> = Record<symbol | string, any>>(head: Unhead<any>, _input: UseScriptInput, _options?: UseScriptOptions<T>): UseScriptReturn<T> | UseScriptScopeReturn<T> {
  return _useScript(head, _input, _options, !!_options?.scope)
}

/** Resolve the shared script and optionally attach a consumer scope. */
function _useScript<T extends Record<symbol | string, any> = Record<symbol | string, any>>(head: Unhead<any>, _input: UseScriptInput, _options: UseScriptOptions<T> | undefined, scoped: boolean): UseScriptReturn<T> | UseScriptScopeReturn<T> {
  // Event handlers below capture this head, so never mutate an input object that
  // may be reused by another SSR request or client app.
  const input: UseScriptResolvedInput = typeof _input === 'string' ? { src: _input } : { ..._input }
  const {
    beforeInit,
    eventContext: _eventContext,
    resolve: resolveApi,
    scope: _scope,
    trigger,
    use,
    warmupStrategy: _warmupStrategy,
    ...entryOptions
  } = _options || {}
  const id = input.key || input.src || (typeof input.innerHTML === 'string' ? input.innerHTML : '')
  const scripts = head._scripts || (head._scripts = Object.create(null))
  const prevScript = Object.hasOwn(scripts, id)
    ? scripts[id] as undefined | UseScriptContext<UseFunctionType<UseScriptOptions<T>, T>>
    : undefined
  if (prevScript) {
    const result = scoped ? createScriptScope(prevScript) : prevScript
    if (scoped)
      result.setupTriggerHandler(trigger)
    else
      prevScript._setupTriggerHandler(trigger, false)
    return result
  }
  const lifecycleController = new AbortController()
  const useContext = {
    signal: lifecycleController.signal,
    waitFor: createScriptWaitFor(lifecycleController.signal),
  }
  const resolveUse = () => resolveApi ? resolveApi(useContext) : use?.()
  beforeInit?.()
  let initialUseResult: T | PromiseLike<T | undefined | null> | undefined | null
  let initialUseError: unknown
  let initialUseFailed = false
  try {
    initialUseResult = !head.ssr && (resolveApi || use)
      ? resolveUse()
      : undefined
  }
  catch (error) {
    initialUseFailed = true
    initialUseError = error
  }
  const initialUseIsAsync = !!initialUseResult && typeof (initialUseResult as PromiseLike<T>).then === 'function'
  const initialInstance = initialUseIsAsync ? null : (initialUseResult as T | null | undefined) || null
  const initialUseOutcome = initialUseFailed
    ? Promise.resolve([false, initialUseError] as const)
    : initialUseIsAsync
      ? Promise.resolve(initialUseResult).then(
          api => [true, api] as const,
          error => [false, error] as const,
        )
      : undefined
  const _events: { type: string, timestamp: number }[] = []
  let loadError: Error | undefined
  const syncStatus = (s: ScriptInstance<T>['status']) => {
    // eslint-disable-next-line ts/no-use-before-define
    script.status = s
    _events.push({ type: s, timestamp: Date.now() })
    // eslint-disable-next-line ts/no-use-before-define
    callHook(head, 'script:updated', hookCtx)
  }
  const failReadiness = (reason: unknown) => {
    loadError = reason instanceof Error ? reason : new Error(String(reason))
    lifecycleController.abort(loadError)
    syncStatus('error')
  }
  let onload = typeof input.onload === 'function' ? input.onload.bind(_eventContext) : null
  let onerror = typeof input.onerror === 'function' ? input.onerror.bind(_eventContext) : null
  const releaseEventHandlers = () => {
    onload = null
    onerror = null
  }
  input.onload = (e: Event) => {
    if (lifecycleController.signal.aborted)
      return
    try {
      syncStatus('loaded')
      onload?.(e)
    }
    finally {
      releaseEventHandlers()
    }
  }
  input.onerror = (e: Event) => {
    if (lifecycleController.signal.aborted)
      return
    try {
      lifecycleController.abort()
      syncStatus('error')
      onerror?.(e)
    }
    finally {
      releaseEventHandlers()
    }
  }

  const _cbs: ScriptInstance<T>['_cbs'] = { loaded: [], error: [] }
  const _uniqueCbs: Set<string> = new Set<string>()
  const callCbs = (cbs: null | ((value: any) => void | Promise<void>)[], value: any) => cbs?.forEach((cb) => {
    try {
      void Promise.resolve(cb(value)).catch(error => console.error(error))
    }
    catch (error) {
      console.error(error)
    }
  })
  const _registerCb = (key: 'loaded' | 'error', cb: any, options?: EventHandlerOptions) => {
    // events will never run
    if (head.ssr) {
      return () => {}
    }
    let uniqueKey: string | undefined
    if (options?.key) {
      uniqueKey = `${key}:${options.key}`
      if (_uniqueCbs.has(uniqueKey)) {
        return () => {}
      }
      _uniqueCbs.add(uniqueKey)
    }
    if (_cbs[key]) {
      _cbs[key].push(cb)
      return () => {
        const idx = _cbs[key]?.indexOf(cb) ?? -1
        if (idx !== -1)
          _cbs[key]?.splice(idx, 1)
        if (uniqueKey)
          _uniqueCbs.delete(uniqueKey)
      }
    }
    // the terminal event already happened: only replay when the status matches
    // this callback, so onLoaded() after an error/removed does not fire
    // eslint-disable-next-line ts/no-use-before-define
    if (key === 'loaded' && script.status === 'loaded')
      // eslint-disable-next-line ts/no-use-before-define
      cb(script.instance)
    // eslint-disable-next-line ts/no-use-before-define
    else if (key === 'error' && script.status === 'error')
      cb(loadError)
    return () => {
      if (uniqueKey)
        _uniqueCbs.delete(uniqueKey)
    }
  }
  const loadPromise = new Promise<T | false>((resolve) => {
    // promise never resolves
    if (head.ssr)
      return
    // resolve on a microtask rather than requestAnimationFrame: rAF is suspended while the
    // tab is hidden, which would defer onLoaded() callbacks indefinitely (unjs/unhead#771)
    const emit = (api: T) => queueMicrotask(() => {
      // eslint-disable-next-line ts/no-use-before-define
      if (lifecycleController.signal.aborted || script.status === 'removed')
        resolve(false)
      else
        resolve(api)
    })
    let resolvingApi = false
    const unhook = head.hooks?.hook('script:updated', ({ script: updatedScript }: { script: ScriptInstance<T> }) => {
      // Same-id scripts can overlap while a removed entry finishes dispatching DOM events.
      // eslint-disable-next-line ts/no-use-before-define
      if (updatedScript !== script)
        return
      // vue augmentation... not ideal
      const status = updatedScript.status
      if (status === 'loaded' || status === 'error' || status === 'removed') {
        if (status === 'loaded') {
          if (resolvingApi)
            return
          resolvingApi = true
          if (!resolveApi && !use) {
            emit({} as T)
            unhook?.()
            return
          }

          const useOutcome = initialUseOutcome || (() => {
            try {
              return Promise.resolve(resolveUse()).then(
                api => [true, api] as const,
                error => [false, error] as const,
              )
            }
            catch (error) {
              return Promise.resolve([false, error] as const)
            }
          })()
          void useOutcome.then((outcome) => {
            if (lifecycleController.signal.aborted || updatedScript.status === 'removed')
              return
            if (!outcome[0]) {
              failReadiness(outcome[1])
            }
            else if (outcome[1]) {
              emit(outcome[1])
              unhook?.()
            }
            else {
              failReadiness(new Error('use() resolved without a script API'))
            }
          })
        }
        else {
          resolve(false) // failed to load
          unhook?.()
        }
      }
    })
  })

  const script = {
    _loadPromise: loadPromise,
    _events,
    _warmupStrategy: undefined as string | undefined,
    instance: initialInstance,
    proxy: null,
    id,
    signal: lifecycleController.signal,
    src: input.src,
    input,
    status: 'awaitingLoad',

    remove() {
      const hadEntry = !!script.entry
      lifecycleController.abort()
      releaseEventHandlers()
      // cancel all pending triggers
      script._triggerAbortControllers?.forEach(ac => ac.abort())
      script._triggerAbortControllers?.clear()
      script._triggerPromises = [] // clear any pending promises
      script._warmupEl?.dispose()
      script._warmupEl = undefined
      if (script.entry) {
        script.entry.dispose()
        script.entry = undefined
      }
      // only delete if the registry still points at this script: a stale handle
      // calling remove() again must not drop a newer same-id script
      if (scripts[id] === script)
        delete scripts[id]
      if (script.status !== 'removed')
        syncStatus('removed')
      return hadEntry
    },
    warmup(rel: WarmupStrategy) {
      const { src } = input
      const isCrossOrigin = !src.startsWith('/') || src.startsWith('//')
      const isPreconnect = rel === 'preconnect' || rel === 'dns-prefetch'
      let href = src
      if (!rel || (isPreconnect && !isCrossOrigin)) {
        return
      }
      if (isPreconnect) {
        const $url = new URL(src)
        href = `${$url.protocol}//${$url.host}`
      }
      // Type assertion is safe: runtime logic ensures `as: 'script'` is set when rel === 'preload',
      // and `as` is omitted for preconnect/dns-prefetch which don't require it.
      const link = {
        href,
        rel,
        crossorigin: typeof input.crossorigin !== 'undefined' ? input.crossorigin : (isCrossOrigin ? 'anonymous' : undefined),
        referrerpolicy: typeof input.referrerpolicy !== 'undefined' ? input.referrerpolicy : (isCrossOrigin ? 'no-referrer' : undefined),
        fetchpriority: typeof input.fetchpriority !== 'undefined' ? input.fetchpriority : 'low',
        integrity: input.integrity,
        as: rel === 'preload' ? 'script' : undefined,
      } as RawInput<'link'>
      script._warmupEl = head.push({ link: [link] }, { head, tagPriority: 'high' })
      return script._warmupEl
    },
    load(cb?: () => void | Promise<void>) {
      // remove() aborts this instance's one-shot signal and load promise.
      if (script.status === 'removed')
        return loadPromise
      // cancel all pending triggers as we've started loading
      script._triggerAbortControllers?.forEach(ac => ac.abort())
      script._triggerAbortControllers?.clear()
      script._triggerPromises = [] // clear any pending promises
      if (!script.entry) {
        syncStatus('loading')
        const defaults: Partial<RawInput<'script'>> = {
          defer: true,
          fetchpriority: 'low',
        }
        // is absolute, add privacy headers
        if (input.src && (input.src.startsWith('http') || input.src.startsWith('//'))) {
          defaults.crossorigin = 'anonymous'
          defaults.referrerpolicy = 'no-referrer'
        }
        // status should get updated from script events
        script.entry = head.push({
          script: [{ ...defaults, ...input }],
        }, entryOptions)
      }
      if (cb)
        _registerCb('loaded', cb)
      return loadPromise
    },
    onLoaded(cb: (instance: T) => void | Promise<void>, options?: EventHandlerOptions) {
      return _registerCb('loaded', cb, options)
    },
    onError(cb: (err?: Error) => void | Promise<void>, options?: EventHandlerOptions) {
      return _registerCb('error', cb, options)
    },
    setupTriggerHandler(trigger: UseScriptOptions['trigger']) {
      return script._setupTriggerHandler(trigger)
    },
    _setupTriggerHandler(trigger: UseScriptOptions['trigger'], removeOnError = true) {
      const noop = () => {}
      if (script.status !== 'awaitingLoad') {
        return noop
      }
      if (((typeof trigger === 'undefined' || trigger === 'client') && !head.ssr) || trigger === 'server') {
        script.load()
        return noop
      }
      else if (trigger instanceof Promise) {
        // promise triggers only work client side
        if (head.ssr) {
          return noop
        }
        // each trigger gets its own abort controller so that disposing one scope
        // does not cancel triggers from other scopes
        const abortController = new AbortController()
        script._triggerAbortControllers = script._triggerAbortControllers || new Set()
        script._triggerAbortControllers.add(abortController)
        const abortPromise = new Promise<void>((resolve) => {
          abortController.signal.addEventListener('abort', () => {
            script._triggerAbortControllers?.delete(abortController)
            resolve()
          })
        })
        // store the latest controller for external access
        script._triggerAbortController = abortController
        script._triggerPromises = script._triggerPromises || []
        const triggerPromise: Promise<void> = Promise.race([
          trigger.then(v => typeof v === 'undefined' || v ? script.load : undefined),
          abortPromise,
        ])
          // OK
          .catch((error) => {
            // Trigger failures leave the script unloaded; consumers can observe status separately.
            void error
          })
          .then((res) => {
            res?.()
          })
          .finally(() => {
            // a settled (non-aborted) trigger never fires its abort event, so drop
            // its controller here to stop it lingering in the set
            script._triggerAbortControllers?.delete(abortController)
            // remove the promise from the list
            const idx = script._triggerPromises?.indexOf(triggerPromise) ?? -1
            if (idx !== -1)
              script._triggerPromises?.splice(idx, 1)
          })
        script._triggerPromises.push(triggerPromise)
        return () => abortController.abort()
      }
      else if (typeof trigger === 'function') {
        // function triggers only work client side
        if (head.ssr) {
          return noop
        }
        const abortController = new AbortController()
        script._triggerAbortControllers = script._triggerAbortControllers || new Set()
        script._triggerAbortControllers.add(abortController)
        script._triggerAbortController = abortController
        let cleanup: void | (() => void)
        abortController.signal.addEventListener('abort', () => {
          script._triggerAbortControllers?.delete(abortController)
          if (typeof cleanup === 'function')
            cleanup()
          cleanup = undefined
        }, { once: true })
        try {
          cleanup = trigger(script.load)
          // A trigger may call load synchronously before returning its disposer.
          if (abortController.signal.aborted) {
            if (typeof cleanup === 'function')
              cleanup()
            cleanup = undefined
          }
        }
        catch (error) {
          abortController.abort()
          if (removeOnError)
            script.remove()
          throw error
        }
        return () => abortController.abort()
      }
      return noop
    },
    _cbs,
  } as any as UseScriptContext<T>
  // script is ready
  loadPromise
    .then((api) => {
      if (api !== false) {
        script.instance = api
        const cbs = _cbs.loaded
        _cbs.loaded = null
        _cbs.error = null
        callCbs(cbs, api)
      }
      else {
        const cbs = script.status === 'error' ? _cbs.error : null
        _cbs.loaded = null
        _cbs.error = null
        callCbs(cbs, loadError)
      }
    })
  const hookCtx = { script }

  const result = scoped ? createScriptScope(script) : script
  try {
    result.setupTriggerHandler(trigger)
  }
  catch (error) {
    script.remove()
    throw error
  }
  if (resolveApi || use) {
    const { proxy, stack } = createNoopedRecordingProxy<T>(head.ssr ? {} as T : initialInstance || {} as T)
    script.proxy = proxy
    script.onLoaded((instance) => {
      replayProxyRecordings(instance, stack)
      script.proxy = createForwardingProxy(instance)
    })
  }
  // need to make sure it's not already registered
  const warmupStrategy = _warmupStrategy || ((typeof trigger === 'undefined' || trigger === 'client') ? 'preload' : false)
  if (warmupStrategy) {
    script._warmupStrategy = warmupStrategy
    script.warmup(warmupStrategy)
  }
  scripts[id] = script
  return result
}
