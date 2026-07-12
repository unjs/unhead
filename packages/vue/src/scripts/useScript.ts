import type { UseScriptInput as BaseUseScriptInput, UseScriptOptions as BaseUseScriptOptions, ScriptHeadTarget, ScriptInstance, UseFunctionType, UseScriptStatus } from 'unhead/scripts'
import type {
  CompatibleHead,
  DataKeys,
  GenericScript,
  HeadEntryOptions,
  ResolvableHead,
  SchemaAugmentations,
} from 'unhead/types'
import type { ComponentInternalInstance, Ref, WatchHandle } from 'vue'
import type { ReactiveHead, ResolvableProperties } from '../types'
import { useScript as _useScript } from 'unhead/scripts'
import { getCurrentInstance, isRef, onMounted, onScopeDispose, ref, watch } from 'vue'
import { injectHead } from '../install'

export type * from 'unhead/scripts'

export interface VueScriptInstance<T extends object> extends Omit<ScriptInstance<T>, 'status'> {
  status: Ref<UseScriptStatus>
}

export type UseScriptInput = string | (ResolvableProperties<Omit<GenericScript & DataKeys & SchemaAugmentations['script'], 'src'>> & { src: string })
export interface UseScriptOptions<T extends object = Record<PropertyKey, unknown>> extends Omit<HeadEntryOptions, 'head'>, Partial<Pick<BaseUseScriptOptions<T>, 'use' | 'eventContext' | 'beforeInit'>> {
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

type CompatibleUseScriptOptions<T extends object> = Omit<UseScriptOptions<T>, 'head'> & {
  head?: ScriptHeadTarget<ReactiveHead>
}

export type UseScriptContext<T extends object> = VueScriptInstance<T>

function registerVueScopeHandlers<T extends object = Record<PropertyKey, unknown>>(script: ScriptInstance<UseFunctionType<UseScriptOptions<T>, T>>, scope?: ComponentInternalInstance | null) {
  if (!scope) {
    return
  }
  // core's onLoaded/onError already register the callback by identity and return
  // an identity-based disposer; we only tie that disposer to the Vue scope so the
  // callback is removed when the owning component unmounts
  const baseOnLoaded = script.onLoaded
  const baseOnError = script.onError
  script.onLoaded = (cb, options) => {
    const off = baseOnLoaded(cb, options)
    onScopeDispose(off)
    return off
  }
  script.onError = (cb, options) => {
    const off = baseOnError(cb, options)
    onScopeDispose(off)
    return off
  }
  // capture the controller at registration time so this scope only aborts
  // the controller it was associated with, not a newer one created by a later scope
  const triggerAbortController = script._triggerAbortController
  onScopeDispose(() => {
    triggerAbortController?.abort()
  })
}

export type UseScriptReturn<T extends object> = UseScriptContext<UseFunctionType<UseScriptOptions<T>, T>>

export function useScript<T extends object = Record<PropertyKey, unknown>>(_input: UseScriptInput, _options: CompatibleUseScriptOptions<T> = {}): UseScriptReturn<T> {
  const input = (typeof _input === 'string' ? { src: _input } : _input) as UseScriptInput
  const options = _options as UseScriptOptions<T>
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
  const script = _useScript(scriptHead, input as unknown as BaseUseScriptInput, options as unknown as BaseUseScriptOptions<T>)
  // @ts-expect-error untyped
  script._statusRef = script._statusRef || ref<UseScriptStatus>(script.status)
  // Note: we don't remove scripts on unmount as it's not a common use case and reloading the script may be expensive
  registerVueScopeHandlers(script, scope)
  return new Proxy(script, {
    get(_, key, a) {
      // we can't override status as it will break the unhead useScript API
      return Reflect.get(_, key === 'status' ? '_statusRef' : key, a)
    },
  }) as unknown as UseScriptReturn<T>
}
