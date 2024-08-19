import { ScriptNetworkEvents, hashCode } from '@unhead/shared'
import type {
  AsAsyncFunctionValues,
  Head,
  ScriptInstance,
  UseScriptInput,
  UseScriptOptions,
  UseScriptResolvedInput,
} from '@unhead/schema'
import { getActiveHead } from './useActiveHead'

export type UseScriptContext<T extends Record<symbol | string, any>> =
  (Promise<T> & ScriptInstance<T>)
  & AsAsyncFunctionValues<T>
  & {
  /**
   * @deprecated Use top-level functions instead.
   */
    $script: Promise<T> & ScriptInstance<T>
  }

const ScriptProxyTarget = Symbol('ScriptProxyTarget')
function sharedTarget() {}
sharedTarget[ScriptProxyTarget] = true

export function resolveScriptKey(input: UseScriptResolvedInput) {
  return input.key || hashCode(input.src || (typeof input.innerHTML === 'string' ? input.innerHTML : ''))
}

/**
 * Load third-party scripts with SSR support and a proxied API.
 *
 * @see https://unhead.unjs.io/usage/composables/use-script
 */
export function useScript<T extends Record<symbol | string, any>>(_input: UseScriptInput, _options?: UseScriptOptions<T>): UseScriptContext<T> {
  const input: UseScriptResolvedInput = typeof _input === 'string' ? { src: _input } : _input
  const options = _options || {}
  const head = options.head || getActiveHead()
  if (!head)
    throw new Error('Missing Unhead context.')

  const id = resolveScriptKey(input)
  if (head._scripts?.[id])
    return head._scripts[id]
  options.beforeInit?.()
  const syncStatus = (s: ScriptInstance<T>['status']) => {
    script.status = s
    head.hooks.callHook(`script:updated`, hookCtx)
  }
  const trigger = options.trigger !== undefined ? options.trigger : 'client'
  ScriptNetworkEvents
    .forEach((fn) => {
      const _fn = typeof input[fn] === 'function' ? input[fn].bind(options.eventContext) : null
      input[fn] = (e: Event) => {
        syncStatus(fn === 'onload' ? 'loaded' : fn === 'onerror' ? 'error' : 'loading')
        _fn?.(e)
      }
    })

  const loadPromise = new Promise<T>((resolve, reject) => {
    // promise never resolves
    if (head.ssr)
      return
    const emit = (api: T) => requestAnimationFrame(() => resolve(api))
    const _ = head.hooks.hook('script:updated', ({ script }) => {
      if (script.id === id && (script.status === 'loaded' || script.status === 'error')) {
        if (script.status === 'loaded') {
          if (typeof options.use === 'function') {
            const api = options.use()
            api && emit(api)
          }
          // scripts without any use() function
          else {
            emit({} as T)
          }
        }
        else if (script.status === 'error') {
          reject(new Error(`Failed to load script: ${input.src}`))
        }
        _()
      }
    })
  })
  const script = Object.assign(loadPromise, {
    instance: (!head.ssr && options?.use?.()) || null,
    proxy: null,
    id,
    status: 'awaitingLoad',
    remove() {
      if (script.entry) {
        script.entry.dispose()
        syncStatus('removed')
        delete head._scripts?.[id]
        return true
      }
      return false
    },
    load() {
      if (!script.entry) {
        syncStatus('loading')
        const defaults: Required<Head>['script'][0] = {
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
          script: [{ ...defaults, ...input, key: `script.${id}` }],
        }, options)
      }
      return loadPromise
    },
  }) as any as UseScriptContext<T>
  loadPromise.then(api => (script.instance = api))
  const hookCtx = { script }
  if ((trigger === 'client' && !head.ssr) || (trigger === 'server' && head.ssr))
    script.load()
  else if (trigger instanceof Promise)
    trigger.then(script.load)
  else if (typeof trigger === 'function')
    trigger(async () => script.load())

  // support deprecated behavior
  script.$script = script
  const proxyChain = (instance: any, accessor?: string | symbol, accessors?: (string | symbol)[]) => {
    return new Proxy((!accessor ? instance : instance?.[accessor]) || sharedTarget, {
      get(_, k, r) {
        head.hooks.callHook('script:instance-fn', { script, fn: k, exists: k in _ })
        if (!accessor) {
          const stub = options.stub?.({ script, fn: k })
          if (stub)
            return stub
        }
        if (_ && k in _) {
          return Reflect.get(_, k, r)
        }
        if (k === Symbol.iterator) {
          return [][Symbol.iterator]
        }
        return proxyChain(accessor ? instance?.[accessor] : instance, k, accessors || [k])
      },
      async apply(_, _this, args) {
        // we are faking, just return, avoid promise handles
        if (head.ssr && _[ScriptProxyTarget])
          return
        let instance: any
        const access = (fn?: T) => {
          instance = fn || instance
          for (let i = 0; i < (accessors || []).length; i++) {
            const k = (accessors || [])[i]
            fn = fn?.[k]
          }
          return fn
        }
        const fn = access(script.instance) || access(await loadPromise)
        return typeof fn === 'function' ? Reflect.apply(fn, instance, args) : fn
      },
    })
  }
  script.proxy = proxyChain(script.instance)
  // remove in v2, just return the script
  const res = new Proxy(script, {
    get(_, k) {
      const target = k in script ? script : script.proxy
      if (k === 'then' || k === 'catch') {
        return script[k].bind(script)
      }
      return Reflect.get(target, k, target)
    },
  })
  head._scripts = Object.assign(head._scripts || {}, { [id]: res })
  return res
}
