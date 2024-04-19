import type {
  UseScriptInput as BaseUseScriptInput,
  DataKeys,
  SchemaAugmentations,
  ScriptBase,
  ScriptInstance,
  UseScriptOptions,
  UseScriptStatus,
} from '@unhead/schema'
import { useScript as _useScript } from 'unhead'
import type { Ref } from 'vue'
import { getCurrentInstance, onMounted, ref } from 'vue'
import type { MaybeComputedRefEntriesOnly } from '../types'
import { injectHead } from './injectHead'

export interface VueScriptInstance<T> extends Omit<ScriptInstance<T>, 'status'> {
  status: Ref<UseScriptStatus>
}

export type UseScriptInput = string | (MaybeComputedRefEntriesOnly<Omit<ScriptBase & DataKeys & SchemaAugmentations['script'], 'src'>> & { src: string })

export function useScript<T extends Record<symbol | string, any>>(_input: UseScriptInput, _options?: UseScriptOptions<T>): T & { $script: VueScriptInstance<T> & Promise<T> } {
  const input = typeof _input === 'string' ? { src: _input } : _input
  const head = injectHead()
  const options = _options || {}
  // @ts-expect-error untyped
  options.head = head
  options.eventContext = getCurrentInstance()
  const status = ref('awaitingLoad')

  const stubOptions = options.stub
  options.stub = ({ script, fn }) => {
    // @ts-expect-error untyped
    script.status = status
    // need to add reactive properties
    if (fn === '$script')
      return script
    return stubOptions?.({ script, fn })
  }
  let instance: T & { $script: VueScriptInstance<T> & Promise<T> }
  // sync the status, need to register before useScript
  const _ = head.hooks.hook('script:updated', ({ script }) => {
    if (instance && script.id === instance.$script.id) {
      status.value = script.status
      // clean up
      script.status === 'removed' && _()
    }
  })
  const scope = getCurrentInstance()
  if (scope && !options.trigger)
    options.trigger = onMounted
  instance = _useScript(input as BaseUseScriptInput, options) as any as T & { $script: VueScriptInstance<T> & Promise<T> }
  // Note: we don't remove scripts on unmount as it's not a common use case and reloading the script may be expensive
  return instance
}
