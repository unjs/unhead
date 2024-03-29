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
import { getCurrentInstance, ref } from 'vue'
import type { MaybeComputedRefEntriesOnly } from '../types'
import { injectHead } from './injectHead'

export interface VueScriptInstance<T> extends Omit<ScriptInstance<T>, 'loaded' | 'status'> {
  status: Ref<UseScriptStatus>
}

export type UseScriptInput = string | (MaybeComputedRefEntriesOnly<Omit<ScriptBase & DataKeys & SchemaAugmentations['script'], 'src'>> & { src: string })

export function useScript<T>(_input: UseScriptInput, _options?: UseScriptOptions<T>): T & { $script: VueScriptInstance<T> } {
  const input = typeof _input === 'string' ? { src: _input } : _input
  const head = injectHead()
  const options = _options || {}
  // @ts-expect-error untyped
  options.head = head
  options.eventContext = getCurrentInstance()
  const status = ref('awaitingLoad')

  const stubOptions = options.stub
  options.stub = ({ script, fn }) => {
    // need to add reactive properties
    if (fn === '$script') {
      // @ts-expect-error untyped
      script.status = status
      return script
    }
    return stubOptions?.({ script: $script, fn })
  }
  let instance: T & { $script: VueScriptInstance<T> }
  // sync the status, need to register before useScript
  const rmHook = head.hooks.hook('script:updated', ({ script }) => {
    if (instance && script.id === instance.$script.id) {
      status.value = script.status
      // clean up
      if (script.status === 'removed')
        rmHook()
    }
  })
  return (instance = _useScript(input as BaseUseScriptInput, options) as T & { $script: VueScriptInstance<T> })
}
