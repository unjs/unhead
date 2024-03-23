import { ScriptNetworkEvents, hashCode } from '@unhead/shared'
import type {
  DomRenderTagContext,
  Head,
  HeadEntryOptions,
  Script,
  ScriptInstance,
  UseScriptInput,
  UseScriptOptions,
  UseScriptResolvedInput,
} from '@unhead/schema'
import { getActiveHead } from './useActiveHead'

const UseScriptDefaults: Script = {
  defer: true,
  fetchpriority: 'low',
}
const requestIdleCallback: Window['requestIdleCallback'] = typeof window === 'undefined'
  ? (() => {}) as any
  : (globalThis.requestIdleCallback || ((cb) => {
      const start = Date.now()
      const idleDeadline = {
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      }
      return setTimeout(() => { cb(idleDeadline) }, 1)
    }))

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
    throw new Error('No active head found, please provide a head instance or use the useHead composable')

  // TODO warn about non-src / non-key input
  const id = input.key || hashCode(input.src || (typeof input.innerHTML === 'string' ? input.innerHTML : ''))
  const key = `use-script.${id}`
  if (head._scripts?.[id])
    return head._scripts[id]

  const script = {
    id,
    status: 'awaitingLoad',
    loaded: false,
    remove() {
      if (script.status === 'loaded') {
        script.entry?.dispose()
        script.status = 'removed'
        head.hooks.callHook(`script:updated`, hookCtx)
        delete head._scripts?.[id]
        return true
      }
      return false
    },
    load() {
      if (script.status !== 'awaitingLoad')
        return script.loadPromise
      script.status = 'loading'
      head.hooks.callHook(`script:updated`, hookCtx)
      script.entry = head.push({
        script: [
          // async by default
          { ...UseScriptDefaults, ...input, key },
        ],
      }, options)
      return script.loadPromise
    },
  } as any as ScriptInstance<T>
  script.loadPromise = new Promise<T>((resolve, reject) => {
    const removeHook = head.hooks.hook('script:updated', ({ script }: { script: ScriptInstance<T> }) => {
      if (script.id === id && (script.status === 'loaded' || script.status === 'error')) {
        script.status === 'loaded' && resolve(options.use?.() as T)
        script.status === 'error' && reject(new Error(`Failed to load script: ${input.src}`))
        removeHook()
      }
    })
  })

  const hookCtx = { script }
  ScriptNetworkEvents
    .forEach((fn) => {
      input[fn] = (e: Event) => {
        script.status = fn === 'onload' ? 'loaded' : fn === 'onerror' ? 'error' : 'loading'
        head.hooks.callHook(`script:updated`, hookCtx)
        typeof input[fn] === 'function' && input[fn].call(options.eventContext, e)
      }
    })

  const trigger = options.trigger
  if (options.trigger)
    trigger instanceof Promise && trigger.then(script.load)
  else
    script.load()

  function resolveInnerHtmlLoad(ctx: DomRenderTagContext) {
    // we don't know up front if they'll be innerHTML or src due to the transform step
    if (ctx.tag.key === key) {
      if (ctx.tag.innerHTML) {
        setTimeout(() => {
          // trigger load event
          script.status = 'loaded'
          head!.hooks.callHook('script:updated', hookCtx)
          typeof input.onload === 'function' && input.onload(new Event('load'))
        }, 5 /* give inline script a chance to run */)
      }
      head!.hooks.removeHook('dom:renderTag', resolveInnerHtmlLoad)
    }
  }
  head.hooks.hook('dom:renderTag', resolveInnerHtmlLoad)

  // 3. Proxy the script API
  const instance = new Proxy({}, {
    get(_, fn) {
      const $script = Object.assign(script.loadPromise, script)
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
        return script.status === 'loaded' ? options.use()[fn](...args) : script.loadPromise.then(api => api[fn](...args))
      }
    },
  }) as any as T & { $script: ScriptInstance<T> }
  // 4. Providing a unique context for the script
  head._scripts = head._scripts || {}
  head._scripts[id] = instance
  return instance
}
