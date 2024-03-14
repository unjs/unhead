import { NetworkEvents, hashCode } from '@unhead/shared'
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
import { defu } from 'defu'
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

  async function transform(entry: Head): Promise<Head> {
    const script = await (options.transform || (input => input))(entry.script![0] as UseScriptResolvedInput)
    const ctx = { script }
    await head!.hooks.callHook('script:transform', ctx)
    return { script: [ctx.script] }
  }

  function maybeHintEarlyConnection(rel: 'preconnect' | 'dns-prefetch') {
    if (
      // opt-out
      options.skipEarlyConnections
      // must be a valid absolute url
      || !input.src.includes('//')
      // must be server-side
      || !head!.ssr
    )
      return
    const key = `use-script.${id}.early-connection`
    head!.push({
      link: [{ key, rel, href: new URL(input.src).origin }],
    }, { mode: 'server' })
  }

  const script: ScriptInstance<T> = {
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
    waitForLoad() {
      return new Promise<T>((resolve) => {
        if (script.status === 'loaded')
          // @ts-expect-error untyped
          resolve(options.use())
        function watchForScriptLoaded({ script }: { script: ScriptInstance<T> }) {
          if (script.id === id && script.status === 'loaded') {
            script.loaded = true
            resolve(options.use?.() as T)
            head!.hooks.removeHook('script:updated', watchForScriptLoaded)
          }
        }
        head.hooks.hook('script:updated', watchForScriptLoaded)
      })
    },
    load() {
      if (script.status !== 'awaitingLoad')
        return script.waitForLoad()
      script.status = 'loading'
      head.hooks.callHook(`script:updated`, hookCtx)
      script.entry = head.push({
        script: [
          // async by default
          { ...UseScriptDefaults, ...input, key },
        ],
      }, {
        ...options as any as HeadEntryOptions,
        // @ts-expect-error untyped
        transform,
        head,
      })
      head._scripts = defu(head._scripts, {
        [id]: script,
      })
      return script.waitForLoad()
    },
  }

  const hookCtx = { script }

  NetworkEvents.forEach((fn) => {
    // clone fn
    const _fn = typeof input[fn] === 'function' ? input[fn].bind({}) : null
    input[fn] = (e: Event) => {
      script.status = fn === 'onload' ? 'loaded' : fn === 'onerror' ? 'error' : 'loading'
      head.hooks.callHook(`script:updated`, hookCtx)
      _fn && _fn(e)
      head._scripts = defu(head._scripts, {
        [id]: script,
      })
    }
  })

  let trigger = options.trigger
  if (trigger) {
    const isIdle = trigger === 'idle'
    if (isIdle) {
      // we don't need idle trigger for server
      if (head.ssr)
        trigger = 'manual'
      else
        // won't work in a SSR environment
        trigger = new Promise<void>(resolve => requestIdleCallback(() => resolve()))
    }
    // never resolves
    trigger === 'manual' && (trigger = new Promise(() => {}))
    // check trigger is a promise
    trigger instanceof Promise && trigger.then(script.load)
    // if we're lazy it's likely it will load within the first 10 seconds, otherwise we just prefetch the DNS for a quicker load
    maybeHintEarlyConnection(isIdle ? 'preconnect' : 'dns-prefetch')
  }
  else {
    script.load()
    // safe to preconnect as we'll load this script quite early
    maybeHintEarlyConnection('preconnect')
  }

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
      if (fn === '$script')
        return script
      const stub = options.stub?.({ script, fn })
      if (stub)
        return stub
      return (...args: any[]) => {
        const hookCtx = { script, fn, args }
        // we can't await this, mainly used for debugging
        head.hooks.callHook('script:instance-fn', hookCtx)
        // third party scripts only run on client-side, mock the function
        if (head.ssr || !options.use)
          return
        // TODO mock invalid environments
        if (script.loaded) {
          const api = options.use()
          // @ts-expect-error untyped
          return api[fn](...args)
        }
        else {
          return script.waitForLoad().then(
            (api) => {
              // @ts-expect-error untyped
              return api[fn](...args)
            },
          )
        }
      }
    },
  }) as any as T & { $script: ScriptInstance<T> }
  // 4. Providing a unique context for the script
  head._scripts = head._scripts || {}
  head._scripts[id] = instance
  return instance
}
