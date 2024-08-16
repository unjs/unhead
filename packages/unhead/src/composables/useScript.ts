import { ScriptNetworkEvents, hashCode } from '@unhead/shared'
import type {
  Head,
  ScriptInstance,
  UseScriptInput,
  UseScriptOptions,
  UseScriptResolvedInput,
} from '@unhead/schema'
import { getActiveHead } from './useActiveHead'

export type UseScriptContext<T extends Record<symbol | string, any>> = (Promise<T> & ScriptInstance<T>) & {
  /**
   * @deprecated Use top-level functions instead.
   */
  $script: Promise<T> & ScriptInstance<T>
}

/**
 * Load third-party scripts with SSR support and a proxied API.
 *
 * @experimental
 * @see https://unhead.unjs.io/usage/composables/use-script
 */
export function useScript<T extends Record<symbol | string, any>>(_input: UseScriptInput, _options?: UseScriptOptions<T>): UseScriptContext<T> {
  const input: UseScriptResolvedInput = typeof _input === 'string' ? { src: _input } : _input
  const options = _options || {}
  const head = options.head || getActiveHead()
  if (!head)
    throw new Error('Missing Unhead context.')

  const id = input.key || hashCode(input.src || (typeof input.innerHTML === 'string' ? input.innerHTML : ''))
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
          script: [{ ...defaults, ...input, key: id }],
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
  // 4. Providing a unique context for the script
  head._scripts = Object.assign(
    head._scripts || {},
    { [id]: script },
  )
  // this is deprecated behavior, user should call explicitly
  if (options.use) {
    script.proxy = new Proxy({} as any as Required<Required<T>['instance']>['proxy'], {
      get(_, k) {
        // remove in v2
        const stub = options.stub?.({ script, fn: k })
        if (stub)
          return stub
        const $_ = script.instance
        const exists = Boolean(!!$_ && k in $_ && $_[k] !== undefined)
        // remove in v2
        head.hooks.callHook('script:instance-fn', { script, fn: k, exists })
        return (...args: any[]) => loadPromise.then((api) => {
          const _k = Reflect.get(api, k)
          return typeof _k === 'function'
            ? Reflect.apply(api[k], api, args)
            : _k
        })
      },
    })
  }
  return script
}
