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
import { callHook } from '../utils/hooks'
import { createForwardingProxy, createNoopedRecordingProxy, replayProxyRecordings } from './proxy'

function resolveScriptKey(input: UseScriptResolvedInput): string {
  return input.key || input.src || (typeof input.innerHTML === 'string' ? input.innerHTML : '')
}

const PreconnectServerModes = /* @__PURE__ */ new Set(['preconnect', 'dns-prefetch'])

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
  if (prevScript) { prevScript.setupTriggerHandler(options.trigger); return prevScript }
  options.beforeInit?.()
  const syncStatus = (s: ScriptInstance<T>['status']) => {
    script.status = s // eslint-disable-line ts/no-use-before-define
    callHook(head, 'script:updated', hookCtx) // eslint-disable-line ts/no-use-before-define
  }
  for (const fn of ScriptNetworkEvents) {
    const k = fn as keyof HttpEventAttributes
    const _fn = typeof input[k] === 'function' ? input[k].bind(options.eventContext) : null
    input[k] = (e: Event) => { syncStatus(fn === 'onload' ? 'loaded' : fn === 'onerror' ? 'error' : 'loading'); _fn?.(e) }
  }

  const _cbs: ScriptInstance<T>['_cbs'] = { loaded: [], error: [] }
  const _uniqueCbs = new Set<string>()
  const _registerCb = (key: 'loaded' | 'error', cb: any, opts?: EventHandlerOptions) => {
    if (head.ssr) return
    if (opts?.key) { const uk = `${opts.key}:${opts.key}`; if (_uniqueCbs.has(uk)) return; _uniqueCbs.add(uk) }
    if (_cbs[key]) { const i: number = _cbs[key].push(cb); return () => _cbs[key]?.splice(i - 1, 1) }
    cb(script.instance) // eslint-disable-line ts/no-use-before-define
    return () => {}
  }

  const _cancelTriggers = () => {
    script._triggerAbortControllers?.forEach(ac => ac.abort()) // eslint-disable-line ts/no-use-before-define
    script._triggerAbortControllers?.clear() // eslint-disable-line ts/no-use-before-define
    script._triggerPromises = [] // eslint-disable-line ts/no-use-before-define
  }

  const loadPromise = new Promise<T | false>((resolve) => {
    if (head.ssr) return
    const unhook = head.hooks?.hook('script:updated', ({ script: s }: { script: ScriptInstance<T> }) => {
      if (s.id === id && (s.status === 'loaded' || s.status === 'error')) {
        if (s.status === 'loaded') {
          const api = typeof options.use === 'function' ? options.use() : {} as T
          if (api) requestAnimationFrame(() => resolve(api))
        }
        else { resolve(false) }
        unhook?.()
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
      _cancelTriggers()
      script._warmupEl?.dispose()
      if (script.entry) { script.entry.dispose(); script.entry = undefined; syncStatus('removed'); delete head._scripts?.[id]; return true }
      return false
    },
    warmup(rel: WarmupStrategy) {
      const { src } = input
      const isCrossOrigin = !src.startsWith('/') || src.startsWith('//')
      const isPreconnect = rel && PreconnectServerModes.has(rel)
      if (!rel || (isPreconnect && !isCrossOrigin)) return
      let href = src
      if (isPreconnect) { const $url = new URL(src); href = `${$url.protocol}//${$url.host}` }
      const link = {
        href, rel,
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
      _cancelTriggers()
      if (!script.entry) {
        syncStatus('loading')
        const defaults: RawInput<'script'> = { defer: true, fetchpriority: 'low' }
        if (input.src && (input.src.startsWith('http') || input.src.startsWith('//'))) { defaults.crossorigin = 'anonymous'; defaults.referrerpolicy = 'no-referrer' }
        script.entry = head.push({ script: [{ ...defaults, ...input }] }, options)
      }
      if (cb) _registerCb('loaded', cb)
      return loadPromise
    },
    onLoaded(cb: (instance: T) => void | Promise<void>, opts?: EventHandlerOptions) { return _registerCb('loaded', cb, opts) },
    onError(cb: (err?: Error) => void | Promise<void>, opts?: EventHandlerOptions) { return _registerCb('error', cb, opts) },
    setupTriggerHandler(trigger: UseScriptOptions['trigger']) {
      if (script.status !== 'awaitingLoad') return
      if (((typeof trigger === 'undefined' || trigger === 'client') && !head.ssr) || trigger === 'server') { script.load(); return }
      if (trigger instanceof Promise) {
        if (head.ssr) return
        const ac = new AbortController()
        script._triggerAbortControllers = script._triggerAbortControllers || new Set()
        script._triggerAbortControllers.add(ac)
        const abortPromise = new Promise<void>(r => ac.signal.addEventListener('abort', () => { script._triggerAbortControllers?.delete(ac); r() }))
        script._triggerAbortController = ac
        script._triggerPromises = script._triggerPromises || []
        const idx = script._triggerPromises.push(
          Promise.race([trigger.then(v => typeof v === 'undefined' || v ? script.load : undefined), abortPromise])
            .catch(() => {}).then(res => res?.()).finally(() => script._triggerPromises?.splice(idx, 1)),
        )
      }
      else if (typeof trigger === 'function') { trigger(script.load) }
    },
    _cbs,
  } as any as UseScriptContext<T>

  loadPromise.then((api) => {
    if (api !== false) { script.instance = api; _cbs.loaded?.forEach(cb => cb(api)); _cbs.loaded = null }
    else { _cbs.error?.forEach(cb => cb()); _cbs.error = null }
  })
  const hookCtx = { script }
  script.setupTriggerHandler(options.trigger)
  if (options.use) {
    const { proxy, stack } = createNoopedRecordingProxy<T>(head.ssr ? {} as T : options.use() || {} as T)
    script.proxy = proxy
    script.onLoaded((instance) => { replayProxyRecordings(instance, stack); script.proxy = createForwardingProxy(instance) })
  }
  if (!options.warmupStrategy && (typeof options.trigger === 'undefined' || options.trigger === 'client')) options.warmupStrategy = 'preload'
  if (options.warmupStrategy) script.warmup(options.warmupStrategy)
  head._scripts = Object.assign(head._scripts || {}, { [id]: script })
  return script
}
