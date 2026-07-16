import type { UseScriptOptions as BaseUseScriptOptions, ScriptScope, UseFunctionType, UseScriptStatus } from 'unhead/scripts'
import type {
  DataKeys,
  GenericScript,
  HeadEntryOptions,
  SchemaAugmentations,
} from 'unhead/types'
import type { Ref, WatchHandle } from 'vue'
import type { ResolvableProperties, VueHeadClient } from '../types'
import { useScriptScope as _useScriptScope } from 'unhead/scripts'
import { getCurrentInstance, isRef, onMounted, onScopeDispose, ref, watch } from 'vue'
import { injectHead } from '../install'

export type * from 'unhead/scripts'

export interface VueScriptInstance<T extends Record<symbol | string, any>> extends Omit<ScriptScope<T>, 'status'> {
  status: Ref<UseScriptStatus>
}

export type UseScriptInput = string | (ResolvableProperties<Omit<GenericScript & DataKeys & SchemaAugmentations['script'], 'src'>> & { src: string })
export interface UseScriptOptions<T extends Record<symbol | string, any> = Record<string, any>> extends Omit<HeadEntryOptions, 'head'>, Partial<Pick<BaseUseScriptOptions<T>, 'use' | 'eventContext' | 'beforeInit'>> {
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
  trigger?: BaseUseScriptOptions['trigger'] | Ref<boolean> | (() => boolean)
  /**
   * Unhead instance.
   */
  head?: VueHeadClient<any>
}

export type UseScriptContext<T extends Record<symbol | string, any>> = VueScriptInstance<T>

export type UseScriptReturn<T extends Record<symbol | string, any>> = UseScriptContext<UseFunctionType<UseScriptOptions<T>, T>>

export function useScript<T extends Record<symbol | string, any> = Record<symbol | string, any>>(_input: UseScriptInput, _options?: UseScriptOptions<T>): UseScriptReturn<T> {
  const input = (typeof _input === 'string' ? { src: _input } : _input) as UseScriptInput
  const options = _options || {} as UseScriptOptions<T>
  const head = options?.head || injectHead()
  options.head = head
  const scope = getCurrentInstance()
  options.eventContext = scope
  if (scope && typeof options.trigger === 'undefined') {
    options.trigger = onMounted
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
    // @ts-expect-error untyped
    if (s._statusRef) {
      // @ts-expect-error untyped
      s._statusRef.value = s.status
    }
  })
  // @ts-expect-error untyped
  const script = _useScriptScope(head, input as BaseUseScriptInput, options)
  // @ts-expect-error untyped
  script.script._statusRef = script.script._statusRef || ref<UseScriptStatus>(script.status)
  // Note: we don't remove scripts on unmount as it's not a common use case and reloading the script may be expensive
  if (scope)
    onScopeDispose(script.dispose)
  return new Proxy(script, {
    get(_, key, a) {
      // we can't override status as it will break the unhead useScript API
      return Reflect.get(_, key === 'status' ? '_statusRef' : key, a)
    },
  }) as any as UseScriptReturn<T>
}
