import { ScriptNetworkEvents, hashCode } from '@unhead/shared'
import type {
  DomRenderTagContext,
  ScriptInstance,
  UseScriptInput,
  UseScriptOptions,
  UseScriptResolvedInput,
} from '@unhead/schema'
import { getActiveHead } from './useActiveHead'

/**
 * Load third-party scripts with SSR support and a proxied API.
 *
 * @experimental
 * @see https://unhead.unjs.io/usage/composables/use-script
 */
export function useScript<T>(_input: UseScriptInput, _options?: UseScriptOptions<T>): T & { $script: ScriptInstance<T> } {
  const input: UseScriptResolvedInput = typeof _input === 'string' ? { src: _input } : _input
  const options = _options || {}
  const head = options.head || getActiveHead()
  if (!head)
    throw new Error('Missing Unhead context.')

  const id = input.key || hashCode(input.src || (typeof input.innerHTML === 'string' ? input.innerHTML : ''))
  const key = `use-script.${id}`
  if (head._scripts?.[id])
    return head._scripts[id]

  let _usePromise: Promise<T> | undefined
  function use() {
    return _usePromise || (_usePromise = new Promise<T>((resolve) => {
      const end = setInterval(() => {
        const api = !!options.use?.()
        if (api) {
          resolve(api)
          clearInterval(end)
        }
      }, 5)
    }))
  }
  const syncStatus = (s: ScriptInstance<T>['status']) => {
    script.status = s
    head.hooks.callHook(`script:updated`, hookCtx)
  }
  const trigger = typeof options.trigger !== 'undefined' ? options.trigger : 'client'
  ScriptNetworkEvents
    .forEach((fn) => {
      const _fn = typeof input[fn] === 'function' ? input[fn].bind(options.eventContext) : null
      input[fn] = (e: Event) => {
        syncStatus(fn === 'onload' ? 'loaded' : fn === 'onerror' ? 'error' : 'loading')
        _fn?.(e)
      }
    })
  const loadPromise = new Promise<T>((resolve, reject) => {
    const cleanUp = head.hooks.hook('script:updated', ({ script }: { script: ScriptInstance<T> }) => {
      if (script.id === id && (script.status === 'loaded' || script.status === 'error')) {
        if (script.status === 'loaded') {
          script.loaded = true
          use().then(api => resolve(api))
        }
        else if (script.status === 'error') { reject(new Error(`Failed to load script: ${input.src}`)) }
        cleanUp()
      }
    })
  })
  const script = {
    id,
    status: 'awaitingLoad',
    loaded: false,
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
        // status should get updated from script events
        script.entry = head.push({
          script: [{ defer: true, fetchpriority: 'low', ...input, key }],
        }, options)
      }
      return loadPromise
    },
  } as any as ScriptInstance<T>

  const hookCtx = { script }

  if ((trigger === 'client' && !head.ssr) || (trigger === 'server' && head.ssr))
    script.load()
  else if (trigger instanceof Promise)
    trigger.then(script.load)
  else if (typeof trigger === 'function')
    trigger(script.load)

  // handle innerHTMl script events
  const removeHook = head.hooks.hook('dom:renderTag', (ctx: DomRenderTagContext) => {
    // we don't know up front if they'll be innerHTML or src due to the transform step
    if (ctx.tag.key !== key)
      return
    if (ctx.tag.innerHTML) {
      setTimeout(() => {
        // trigger load event
        syncStatus('loaded')
        typeof input.onload === 'function' && input.onload.call(options.eventContext, new Event('load'))
      }, 5 /* give inline script a chance to run */)
    }
    removeHook()
  })

  // 3. Proxy the script API
  const instance = new Proxy({}, {
    get(_, fn) {
      const $script = Object.assign(loadPromise, script)
      const stub = options.stub?.({ script: $script, fn })
      if (stub)
        return stub
      // $script is stubbed by abstraction layers
      if (fn === '$script')
        return $script
      return (...args: any[]) => {
        const hookCtx = { script, fn, args }
        // we can't await this, mainly used for debugging
        head.hooks.callHook('script:instance-fn', hookCtx)
        // third party scripts only run on client-side, mock the function
        if (head.ssr || !options.use)
          return
        // @ts-expect-error untyped
        return loadPromise.then(api => api[fn]?.(...args))
      }
    },
  }) as any as T & { $script: ScriptInstance<T> }
  // 4. Providing a unique context for the script
  head._scripts = Object.assign(
    head._scripts || {},
    { [id]: instance },
  )
  return instance
}
