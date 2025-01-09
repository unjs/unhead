import type { UseScriptOptions as CurrentUseScriptOptions, ScriptInstance, UseFunctionType, UseScriptInput } from './types'
import { useUnhead } from 'unhead'
import { useScript as _useScript } from './useScript'

export interface UseScriptOptions<T extends BaseScriptApi = Record<string, any>> extends CurrentUseScriptOptions {
  /**
   * Stub the script instance. Useful for SSR or testing.
   */
  stub?: ((ctx: { script: ScriptInstance<T>, fn: string | symbol }) => any)
}

type BaseScriptApi = Record<symbol | string, any>

export type AsAsyncFunctionValues<T extends BaseScriptApi> = {
  [key in keyof T]:
  T[key] extends any[] ? T[key] :
    T[key] extends (...args: infer A) => infer R ? (...args: A) => R extends Promise<any> ? R : Promise<R> :
      T[key] extends Record<any, any> ? AsAsyncFunctionValues<T[key]> :
        never
}

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
function scriptProxy() {}
scriptProxy[ScriptProxyTarget] = true

export function useScript<T extends Record<symbol | string, any> = Record<symbol | string, any>>(_input: UseScriptInput, _options?: UseScriptOptions<T>): UseScriptContext<UseFunctionType<UseScriptOptions<T>, T>> {
  const head = _options?.head || useUnhead()
  const script = _useScript(_input, _options) as any as UseScriptContext<T>
  // support deprecated behavior
  script.$script = script
  const proxyChain = (instance: any, accessor?: string | symbol, accessors?: (string | symbol)[]) => {
    return new Proxy((!accessor ? instance : instance?.[accessor]) || scriptProxy, {
      get(_, k, r) {
        // @ts-expect-error untyped
        head.hooks.callHook('script:instance-fn', { script, fn: k, exists: k in _ })
        if (!accessor) {
          const stub = _options?.stub?.({ script, fn: k })
          if (stub)
            return stub
        }
        if (_ && k in _ && typeof _[k] !== 'undefined') {
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
        let fn = access(script.instance)
        if (!fn) {
          fn = await (new Promise<T | undefined>((resolve) => {
            script.onLoaded((api) => {
              resolve(access(api))
            })
          }))
        }
        return typeof fn === 'function' ? Reflect.apply(fn, instance, args) : fn
      },
    })
  }
  script.proxy = proxyChain(script.instance)
  return new Proxy(Object.assign(script._loadPromise, script), {
    get(_, k) {
      // _ keys are reserved for internal overrides
      const target = (k in script || String(k)[0] === '_') ? script : script.proxy
      if (k === 'then' || k === 'catch') {
        return script[k].bind(script)
      }
      return Reflect.get(target, k, target)
    },
  })
}
