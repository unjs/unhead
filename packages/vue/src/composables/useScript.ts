import type {
  AsAsyncFunctionValues,
  UseScriptInput as BaseUseScriptInput,
  DataKeys,
  SchemaAugmentations,
  ScriptBase,
  ScriptInstance,
  UseScriptOptions,
  UseScriptResolvedInput,
  UseScriptStatus,
} from '@unhead/schema'
import { useScript as _useScript, resolveScriptKey } from 'unhead'
import type { Ref } from 'vue'
import { getCurrentInstance, onMounted, ref } from 'vue'
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

export function useScript<T extends Record<symbol | string, any>>(_input: UseScriptInput, _options?: UseScriptOptions<T>): UseScriptContext<T> {
  const input = (typeof _input === 'string' ? { src: _input } : _input) as UseScriptResolvedInput
  const head = injectHead()
  const options = _options || {}
  // @ts-expect-error untyped
  options.head = head
  options.eventContext = getCurrentInstance()
  const scope = getCurrentInstance()
  if (scope && !options.trigger)
    options.trigger = onMounted
  const key = resolveScriptKey(input)
  if (head._scripts?.[key])
    return head._scripts[key]
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
  script.status = status
  return script
}
