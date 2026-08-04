import type {
  HttpEventAttributes,
  RawInput,
  Unhead,
} from '../types'
import type {
  EventHandlerOptions,
  ScriptInstance,
  UseFunctionType,
  UseScriptContext,
  UseScriptInput,
  UseScriptOptions,
  UseScriptResolvedInput,
  UseScriptReturn,
  WarmupStrategy,
} from './types'
import { ScriptNetworkEvents } from '../utils'
import { createScriptProxy } from './proxy'

/**
 * @deprecated compute key manually
 */
export function resolveScriptKey(input: UseScriptResolvedInput): string {
  return input.key || input.src || (typeof input.innerHTML === 'string' ? input.innerHTML : '')
}

const PreconnectServerModes = ['preconnect', 'dns-prefetch']

/**
 * Load third-party scripts with SSR support and a proxied API.
 *
 * @see https://unhead.unjs.io/usage/composables/use-script
 */
export function useScript<T extends Record<symbol | string, any> = Record<symbol | string, any>>(head: Unhead<any>, _input: UseScriptInput, _options?: UseScriptOptions<T>): UseScriptReturn<T> {
  const input: UseScriptResolvedInput = typeof _input === 'string' ? { src: _input } : _input
  const options = _options || {}
  const id = resolveScriptKey(input)
  const scripts = head._scripts || (head._scripts = Object.create(null))
  const prevScript = Object.prototype.hasOwnProperty.call(scripts, id)
    ? scripts[id] as undefined | UseScriptContext<UseFunctionType<UseScriptOptions<T>, T>>
    : undefined
  if (prevScript) {
    prevScript.setupTriggerHandler(options.trigger)
    return prevScript
  }
  options.beforeInit?.()
  const syncStatus = (s: ScriptInstance<T>['status']) => {
    // eslint-disable-next-line ts/no-use-before-define
    script.status = s
    // eslint-disable-next-line ts/no-use-before-define
    head.hooks.callHook(`script:updated`, hookCtx)
  }
  ScriptNetworkEvents
    .forEach((fn) => {
      const k = fn as keyof HttpEventAttributes
      const _fn = typeof input[k] === 'function' ? input[k].bind(options.eventContext) : null
      input[k] = (e: Event) => {
        // eslint-disable-next-line ts/no-use-before-define
        if (script.status === 'removed')
          return
        syncStatus(fn === 'onload' ? 'loaded' : fn === 'onerror' ? 'error' : 'loading')
        _fn?.(e)
      }
    })

  const _cbs: ScriptInstance<T>['_cbs'] = { loaded: [], error: [] }
  const _uniqueCbs: Set<string> = new Set<string>()
  const _registerCb = (key: 'loaded' | 'error', cb: any, options?: EventHandlerOptions) => {
    // events will never run
    if (head.ssr) {
      return
    }
    let uniqueKey: string | undefined
    if (options?.key) {
      uniqueKey = `${key}:${options.key}`
      if (_uniqueCbs.has(uniqueKey)) {
        return
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
    // eslint-disable-next-line ts/no-use-before-define
    if (key === 'loaded' && script.status === 'loaded')
      // eslint-disable-next-line ts/no-use-before-define
      cb(script.instance)
    // eslint-disable-next-line ts/no-use-before-define
    else if (key === 'error' && script.status === 'error')
      cb()
    return () => {
      if (uniqueKey)
        _uniqueCbs.delete(uniqueKey)
    }
  }
  const loadPromise = new Promise<T | false>((resolve) => {
    // promise never resolves
    if (head.ssr)
      return
    const emit = (api: T) => queueMicrotask(() => resolve(api))
    const _ = head.hooks.hook('script:updated', ({ script: updatedScript }) => {
      // eslint-disable-next-line ts/no-use-before-define
      if (updatedScript !== script)
        return
      // vue augmentation... not ideal
      const status = updatedScript.status
      if (status === 'loaded' || status === 'error' || status === 'removed') {
        if (status === 'loaded') {
          if (typeof options.use === 'function') {
            const api = options.use()
            if (api) {
              emit(api)
            }
          }
          else {
            emit({} as T)
          }
        }
        else if (status === 'error') {
          resolve(false) // failed to load
        }
        else if (status === 'removed') {
          resolve(false)
        }
        _()
      }
    })
  })

  const script = {
    _loadPromise: loadPromise,
    instance: (!head.ssr && options?.use?.()) || null,
    proxy: null,
    id,
    status: 'awaitingLoad',

    remove() {
      const hadEntry = !!script.entry
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
      if (scripts[id] === script)
        delete scripts[id]
      if (script.status !== 'removed')
        syncStatus('removed')
      return hadEntry
    },
    warmup(rel: WarmupStrategy) {
      const { src } = input
      const isCrossOrigin = !src.startsWith('/') || src.startsWith('//')
      const isPreconnect = rel && PreconnectServerModes.includes(rel)
      let href = src
      if (!rel || (isPreconnect && !isCrossOrigin)) {
        return
      }
      if (isPreconnect) {
        const $url = new URL(src)
        href = `${$url.protocol}//${$url.host}`
      }
      const link: RawInput<'link'> = {
        href,
        rel,
        crossorigin: typeof input.crossorigin !== 'undefined' ? input.crossorigin : (isCrossOrigin ? 'anonymous' : undefined),
        referrerpolicy: typeof input.referrerpolicy !== 'undefined' ? input.referrerpolicy : (isCrossOrigin ? 'no-referrer' : undefined),
        fetchpriority: typeof input.fetchpriority !== 'undefined' ? input.fetchpriority : 'low',
        integrity: input.integrity,
        as: rel === 'preload' ? 'script' : undefined,
      }
      script._warmupEl = head.push({ link: [link] }, { head, tagPriority: 'high' })
      return script._warmupEl
    },
    load(cb?: () => void | Promise<void>) {
      if (script.status === 'removed')
        return loadPromise
      // cancel all pending triggers as we've started loading
      script._triggerAbortControllers?.forEach(ac => ac.abort())
      script._triggerAbortControllers?.clear()
      script._triggerPromises = [] // clear any pending promises
      if (!script.entry) {
        syncStatus('loading')
        const defaults: RawInput<'script'> = {
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
        }, options)
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
      if (script.status !== 'awaitingLoad') {
        return
      }
      if (((typeof trigger === 'undefined' || trigger === 'client') && !head.ssr) || trigger === 'server') {
        script.load()
      }
      else if (trigger instanceof Promise) {
        // promise triggers only work client side
        if (head.ssr) {
          return
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
          .catch(() => {})
          .then((res) => {
            res?.()
          })
          .finally(() => {
            script._triggerAbortControllers?.delete(abortController)
            // remove the promise from the list
            const idx = script._triggerPromises?.indexOf(triggerPromise) ?? -1
            if (idx !== -1)
              script._triggerPromises?.splice(idx, 1)
          })
        script._triggerPromises.push(triggerPromise)
      }
      else if (typeof trigger === 'function') {
        trigger(script.load)
      }
    },
    _cbs,
  } as any as UseScriptContext<T>
  // script is ready
  loadPromise
    .then((api) => {
      if (api !== false) {
        script.instance = api
        _cbs.loaded?.forEach(cb => cb(api))
        _cbs.loaded = null
      }
      else {
        if (script.status === 'error')
          _cbs.error?.forEach(cb => cb())
        _cbs.loaded = null
        _cbs.error = null
      }
    })
  const hookCtx = { script }

  script.setupTriggerHandler(options.trigger)
  if (options.use) {
    const { proxy, resolve } = createScriptProxy<T>(head.ssr ? {} as T : options.use() || {} as T)
    script.proxy = proxy
    script.onLoaded(resolve)
  }
  // need to make sure it's not already registered
  if (!options.warmupStrategy && (typeof options.trigger === 'undefined' || options.trigger === 'client')) {
    options.warmupStrategy = 'preload'
  }
  if (options.warmupStrategy) {
    script.warmup(options.warmupStrategy)
  }
  scripts[id] = script
  return script
}
