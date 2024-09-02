import type {
  AsAsyncFunctionValues,
  UseScriptInput as BaseUseScriptInput,
  DataKeys,
  SchemaAugmentations,
  ScriptBase,
  ScriptInstance,
  UseFunctionType,
  UseScriptOptions,
  UseScriptResolvedInput,
  UseScriptStatus,
} from '@unhead/schema'
import { useScript as _useScript, resolveScriptKey } from 'unhead'
import type { ComponentInternalInstance, Ref } from 'vue'
import { getCurrentInstance, onMounted, onScopeDispose, ref } from 'vue'

import type { MaybeComputedRefEntriesOnly } from '../types'
import { injectHead } from './injectHead'

export interface VueScriptInstance<T extends Record<symbol | string, any>> extends Omit<ScriptInstance<T>, 'status'> {
  status: Ref<UseScriptStatus>
}

export type UseScriptInput = string | (MaybeComputedRefEntriesOnly<Omit<ScriptBase & DataKeys & SchemaAugmentations['script'], 'src'>> & { src: string })

export type UseScriptContext<T extends Record<symbol | string, any>> =
  (Promise<T> & VueScriptInstance<T>)
  & AsAsyncFunctionValues<T>
  & {
  /**
   * @deprecated Use top-level functions instead.
   */
    $script: Promise<T> & VueScriptInstance<T>
  }

function registerVueScopeHandlers<T extends Record<symbol | string, any> = Record<symbol | string, any>>(script: UseScriptContext<UseFunctionType<UseScriptOptions<T, any>, T>>, scope?: ComponentInternalInstance | null) {
  if (!scope) {
    return
  }
  const _registerCb = (key: 'loaded' | 'error', cb: any) => {
    if (!script._cbs[key]) {
      cb(script.instance)
      return () => {}
    }
    let i: number | null = script._cbs[key].push(cb)
    const destroy = () => {
      // avoid removing the wrong callback
      if (i) {
        script._cbs[key]?.splice(i - 1, 1)
        i = null
      }
    }
    onScopeDispose(destroy)
    return destroy
  }
  onScopeDispose(() => {
    // if we registered the script using a promise trigger we need to drop the promise on dispose
    // i.e shouldn't load if we've out of the scope
    script._triggerAbortController?.abort()
  })
  // if we have a scope we should make these callbacks reactive
  script.onLoaded = (cb: (instance: T) => void | Promise<void>) => _registerCb('loaded', cb)
  script.onError = (cb: (err?: Error) => void | Promise<void>) => _registerCb('error', cb)
}

export function useScript<T extends Record<symbol | string, any> = Record<symbol | string, any>, U = Record<symbol | string, any>>(_input: UseScriptInput, _options?: UseScriptOptions<T, U>): UseScriptContext<UseFunctionType<UseScriptOptions<T, U>, T>> {
  const input = (typeof _input === 'string' ? { src: _input } : _input) as UseScriptResolvedInput
  const head = injectHead()
  const options = _options || {}
  // @ts-expect-error untyped
  options.head = head
  const scope = getCurrentInstance()
  options.eventContext = scope
  if (scope && typeof options.trigger === 'undefined')
    options.trigger = onMounted
  const id = resolveScriptKey(input)
  const prevScript = head._scripts?.[id] as undefined | UseScriptContext<UseFunctionType<UseScriptOptions<T, U>, T>>
  if (prevScript) {
    prevScript.updateTrigger(options.trigger)
    // prev script scope may be lost if not loaded
    registerVueScopeHandlers(prevScript, scope)
    return prevScript
  }
  let script: UseScriptContext<T>
  // we may be re-using an existing script
  const status = ref<UseScriptStatus>('awaitingLoad')
  // sync the status, need to register before useScript
  const _ = head.hooks.hook('script:updated', ({ script: s }) => {
    if (script && s.id === script.id) {
      status.value = s.status
      // clean up
      if (s.status === 'removed') {
        _()
      }
    }
  })
  script = _useScript(input as BaseUseScriptInput, options) as any as UseScriptContext<T>
  // Note: we don't remove scripts on unmount as it's not a common use case and reloading the script may be expensive
  registerVueScopeHandlers(script, scope)
  return new Proxy(script, {
    get(_, key, a) {
      // we can't override status as there's a race condition
      if (key === 'status')
        return status
      return Reflect.get(_, key, a)
    },
  })
}
