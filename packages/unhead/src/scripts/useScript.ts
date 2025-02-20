import type {
  ResolvedHead,
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
import { createForwardingProxy, createNoopedRecordingProxy, replayProxyRecordings } from './proxy'

export function resolveScriptKey(input: UseScriptResolvedInput) {
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
  const prevScript = head._scripts?.[id] as undefined | UseScriptContext<UseFunctionType<UseScriptOptions<T>, T>>
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
      const _fn = typeof input[fn] === 'function' ? input[fn].bind(options.eventContext) : null
      input[fn] = (e: Event) => {
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
    if (options?.key) {
      const key = `${options?.key}:${options.key}`
      if (_uniqueCbs.has(key)) {
        return
      }
      _uniqueCbs.add(key)
    }
    if (_cbs[key]) {
      const i: number = _cbs[key].push(cb)
      return () => _cbs[key]?.splice(i - 1, 1)
    }
    // the event has already happened, run immediately
    // eslint-disable-next-line ts/no-use-before-define
    cb(script.instance)
    return () => {}
  }
  const loadPromise = new Promise<T | false>((resolve) => {
    // promise never resolves
    if (head.ssr)
      return
    const emit = (api: T) => requestAnimationFrame(() => resolve(api))
    const _ = head.hooks.hook('script:updated', ({ script }) => {
      // vue augmentation... not ideal
      const status = script.status
      if (script.id === id && (status === 'loaded' || status === 'error')) {
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
      // cancel any pending triggers as we've started loading
      script._triggerAbortController?.abort()
      script._triggerPromises = [] // clear any pending promises
      script._warmupEl?.dispose()
      if (script.entry) {
        script.entry.dispose()
        script.entry = undefined
        syncStatus('removed')
        delete head._scripts?.[id]
        return true
      }
      return false
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
      const link: Required<ResolvedHead>['link'][0] = {
        href,
        rel,
        crossorigin: input.crossorigin || isCrossOrigin ? 'anonymous' : undefined,
        referrerpolicy: input.referrerpolicy || isCrossOrigin ? 'no-referrer' : undefined,
        fetchpriority: input.fetchpriority || 'low',
        integrity: input.integrity,
        as: rel === 'preload' ? 'script' : undefined,
      }
      script._warmupEl = head.push({ link: [link] }, { head, tagPriority: 'high' })
      return script._warmupEl
    },
    load(cb?: () => void | Promise<void>) {
      // cancel any pending triggers as we've started loading
      script._triggerAbortController?.abort()
      script._triggerPromises = [] // clear any pending promises
      if (!script.entry) {
        syncStatus('loading')
        const defaults: Required<ResolvedHead>['script'][0] = {
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
        if (!script._triggerAbortController) {
          script._triggerAbortController = new AbortController()
          script._triggerAbortPromise = new Promise<void>((resolve) => {
            script._triggerAbortController!.signal.addEventListener('abort', () => {
              script._triggerAbortController = null
              resolve()
            })
          })
        }
        script._triggerPromises = script._triggerPromises || []
        const idx = script._triggerPromises.push(Promise.race([
          trigger.then(v => typeof v === 'undefined' || v ? script.load : undefined),
          script._triggerAbortPromise,
        ])
          // OK
          .catch(() => {})
          .then((res) => {
            res?.()
          })
          .finally(() => {
            // remove the promise from the list
            script._triggerPromises?.splice(idx, 1)
          }))
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
        _cbs.error?.forEach(cb => cb())
        _cbs.error = null
      }
    })
  const hookCtx = { script }

  script.setupTriggerHandler(options.trigger)
  if (options.use) {
    const { proxy, stack } = createNoopedRecordingProxy<T>(options.use() || {} as T)
    script.proxy = proxy
    script.onLoaded((instance) => {
      replayProxyRecordings(instance, stack)
      // just forward everything with the same behavior
      script.proxy = createForwardingProxy(instance)
    })
  }
  // need to make sure it's not already registered
  if (!options.warmupStrategy && (typeof options.trigger === 'undefined' || options.trigger === 'client')) {
    options.warmupStrategy = 'preload'
  }
  if (options.warmupStrategy) {
    script.warmup(options.warmupStrategy)
  }
  head._scripts = Object.assign(head._scripts || {}, { [id]: script })
  return script
}
