import type { UseScriptInput as BaseUseScriptInput, UseScriptOptions as BaseUseScriptOptions, ScriptHeadTarget, ScriptInstance, ScriptScope, UseFunctionType, UseScriptContextOptions, UseScriptStatus } from 'unhead/scripts'
import type {
  CompatibleHead,
  DataKeys,
  GenericScript,
  HeadEntryOptions,
  ResolvableHead,
  SchemaAugmentations,
} from 'unhead/types'
import type { Ref, WatchHandle } from 'vue'
import type { ReactiveHead, ResolvableProperties } from '../types'
import { useScript as _useScript } from 'unhead/scripts'
import { getCurrentInstance, isRef, onMounted, onScopeDispose, ref, watch } from 'vue'
import { injectHead } from '../install'

export type * from 'unhead/scripts'

export interface VueScriptInstance<T extends object> extends Omit<ScriptInstance<T>, 'status'> {
  status: Ref<UseScriptStatus>
}

export interface VueScriptScope<T extends object> extends Omit<ScriptScope<T>, 'status'> {
  status: Ref<UseScriptStatus>
}

export type UseScriptInput = string | (ResolvableProperties<Omit<GenericScript & DataKeys & SchemaAugmentations['script'], 'src'>> & { src: string })
export interface UseScriptOptions<T extends object = Record<PropertyKey, unknown>> extends Omit<HeadEntryOptions, 'head'>, Partial<Pick<BaseUseScriptOptions<T>, 'use' | 'resolve' | 'eventContext' | 'beforeInit' | 'scope'>> {
  /**
   * The trigger to load the script:
   * - `undefined` | `client` - (Default) Load the script on the client when this js is loaded.
   * - `manual` - Load the script manually by calling `$script.load()`, exists only on the client.
   * - `Promise` - Load the script when the promise resolves, exists only on the client.
   * - `Function` - Register a callback function to load the script, exists only on the client.
   * - `server` - Have the script injected on the server.
   * - `Ref<boolean>` - Load the script when the ref becomes true.
   * - `() => boolean` - Getter function, load the script when return value becomes true.
   */
  trigger?: BaseUseScriptOptions<T>['trigger'] | Ref<boolean> | (() => boolean)
  /**
   * Unhead instance.
   */
  head?: ScriptHeadTarget<ReactiveHead>
}

export type UseScriptContext<T extends object> = VueScriptInstance<T>

export type UseScriptReturn<T extends object> = UseScriptContext<UseFunctionType<UseScriptOptions<T>, T>>

export type UseScriptScopeReturn<T extends object> = VueScriptScope<UseFunctionType<UseScriptOptions<T>, T>>

type ScriptApi = Record<symbol | string, any>
type ResolveScriptOptions<R> = Omit<UseScriptOptions<any>, 'resolve' | 'use'> & { resolve: (ctx: UseScriptContextOptions) => R, use?: never }
type ResolvedScriptApi<R> = Extract<NonNullable<Awaited<R>>, ScriptApi>

export function useScript<R>(_input: UseScriptInput, _options: ResolveScriptOptions<R> & { scope: true }): VueScriptScope<ResolvedScriptApi<R>>
export function useScript<R>(_input: UseScriptInput, _options: ResolveScriptOptions<R> & { scope?: false }): VueScriptInstance<ResolvedScriptApi<R>>
export function useScript<R>(_input: UseScriptInput, _options: ResolveScriptOptions<R>): VueScriptInstance<ResolvedScriptApi<R>> | VueScriptScope<ResolvedScriptApi<R>>
export function useScript<T extends object = Record<PropertyKey, unknown>>(_input: UseScriptInput, _options: UseScriptOptions<T> & { scope: true }): UseScriptScopeReturn<T>
export function useScript<T extends object = Record<PropertyKey, unknown>>(_input: UseScriptInput, _options?: UseScriptOptions<T> & { scope?: false }): UseScriptReturn<T>
export function useScript<T extends object = Record<PropertyKey, unknown>>(_input: UseScriptInput, _options?: UseScriptOptions<T>): UseScriptReturn<T> | UseScriptScopeReturn<T>
export function useScript<T extends object = Record<PropertyKey, unknown>>(_input: UseScriptInput, _options?: UseScriptOptions<T>): UseScriptReturn<T> | UseScriptScopeReturn<T> {
  const input = (typeof _input === 'string' ? { src: _input } : _input) as UseScriptInput
  const options = { ..._options } as UseScriptOptions<T>
  const head = options?.head || injectHead()
  const scriptHead = head as unknown as CompatibleHead<ResolvableHead>
  options.head = head
  const scope = getCurrentInstance()
  options.eventContext = scope
  if (scope && typeof options.trigger === 'undefined') {
    options.trigger = load => onMounted(() => {
      void load()
    })
  }
  else if (isRef(options.trigger) || (typeof options.trigger === 'function' && options.trigger.length === 0)) {
    // Handle refs, computed refs, and getter functions (zero-arg functions that return boolean)
    // Getter functions like `() => shouldLoad.value` have length 0
    // Callback functions like `(load) => onMounted(load)` have length 1+
    const trigger = options.trigger as Ref<boolean> | (() => boolean)
    let off: WatchHandle
    options.trigger = new Promise<boolean>((resolve) => {
      off = watch(trigger, (val) => {
        if (val) {
          resolve(true)
        }
      }, {
        immediate: true,
      })
      onScopeDispose(() => resolve(false), true)
    }).then((val) => {
      off?.()
      return val
    })
  }
  // we may be re-using an existing script
  // sync the status, need to register before useScript
  // @ts-expect-error untyped
  head._scriptStatusWatcher = head._scriptStatusWatcher || head.hooks.hook('script:updated', ({ script: s }) => {
    if (s._statusRef) {
      s._statusRef.value = s.status
    }
  })
  const script = _useScript(scriptHead, input as unknown as BaseUseScriptInput, options as unknown as BaseUseScriptOptions<T>) as ScriptInstance<T> | ScriptScope<T>
  const scoped = options.scope === true
  const sharedScript = (scoped ? (script as ScriptScope<T>).script : script) as ScriptInstance<T>
  // @ts-expect-error untyped
  sharedScript._statusRef = sharedScript._statusRef || ref<UseScriptStatus>(sharedScript.status)

  let onLoaded = script.onLoaded
  let onError = script.onError
  // Note: we don't remove scripts on unmount as it's not a common use case and reloading the script may be expensive
  if (scope) {
    if (scoped) {
      onScopeDispose((script as ScriptScope<T>).dispose)
    }
    else {
      const baseOnLoaded = script.onLoaded
      const baseOnError = script.onError
      onLoaded = (cb, eventOptions) => {
        const off = baseOnLoaded(cb, eventOptions)
        onScopeDispose(off)
        return off
      }
      onError = (cb, eventOptions) => {
        const off = baseOnError(cb, eventOptions)
        onScopeDispose(off)
        return off
      }
      const triggerAbortController = script._triggerAbortController
      onScopeDispose(() => triggerAbortController?.abort())
    }
  }
  return new Proxy(script, {
    get(_, key, a) {
      // we can't override status as it will break the unhead useScript API
      if (key === 'status')
        return (sharedScript as any)._statusRef
      if (key === 'onLoaded')
        return onLoaded
      if (key === 'onError')
        return onError
      return Reflect.get(_, key, a)
    },
  }) as unknown as UseScriptReturn<T> | UseScriptScopeReturn<T>
}
