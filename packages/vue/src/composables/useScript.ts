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

  options.stub = ({ script, fn }) => {
    if (fn === '$script') {
      return Object.assign(script, {
        status,
      })
    }
  }

  const instance = _useScript(input as BaseUseScriptInput, options) as T & { $script: VueScriptInstance<T> }

  function syncStatus({ script }: { script: ScriptInstance<T> }) {
    if (script.id === instance.$script.id) {
      status.value = script.status
      // clean up
      if (script.status === 'removed')
        head.hooks.removeHook(`script:updated`, syncStatus)
    }
  }
  // sync the status
  head.hooks.hook(`script:updated`, syncStatus)
  return instance
}
