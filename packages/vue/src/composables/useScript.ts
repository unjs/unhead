import type { ScriptInstance, UseScriptInput, UseScriptOptions, UseScriptStatus } from '@unhead/schema'
import { useScript as _useScript } from 'unhead'
import type { ComputedRef, Ref } from 'vue'
import { computed, getCurrentInstance, ref } from 'vue'
import { NetworkEvents } from '@unhead/shared'
import { resolveUnrefHeadInput } from '../utils'
import type { MaybeComputedRefEntries } from '../types'
import { injectHead } from './injectHead'

export interface VueScriptInstance<T> extends Omit<ScriptInstance<T>, 'loaded' | 'status'> {
  loaded: ComputedRef<boolean>
  status: Ref<UseScriptStatus>
}

export function useScript<T>(_input: MaybeComputedRefEntries<UseScriptInput>, _options?: UseScriptOptions<T>): T & { $script: VueScriptInstance<T> } {
  const head = injectHead()
  // TODO reactivity
  const ctx = getCurrentInstance()
  const input = (resolveUnrefHeadInput(_input) || {}) as UseScriptInput
  const options = _options || {}
  // @ts-expect-error untyped
  options.head = head
  const status = ref('awaitingLoad')

  NetworkEvents.forEach((fn) => {
    // @ts-expect-error untyped
    const _fn = typeof input[fn] === 'function' ? input[fn].bind(ctx) : null
    // @ts-expect-error untyped
    input[fn] = (e: Event) => {
      status.value = fn === 'onload' ? 'loaded' : fn === 'onerror' ? 'error' : 'loading'
      _fn && _fn(e)
    }
  })

  options.stub = ({ script, fn }) => {
    if (fn === '$script') {
      return {
        ...script,
        status,
        loaded: computed(() => status.value === 'loaded'),
      }
    }
  }
  return _useScript(input, options) as T & { $script: VueScriptInstance<T> }
}
