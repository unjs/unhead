import { getActiveHead } from 'unhead'
import { inject } from 'vue'
import type { MergeHead } from '@unhead/schema'
import { headSymbol } from '../createHead'
import type { VueHeadClient } from '../types'

const _global
  = typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
        ? global
        : typeof self !== 'undefined'
          ? self
          : {}

const globalKey = '__unhead_injection_handler__'

export function setHeadInjectionHandler(handler: () => VueHeadClient<any> | undefined) {
  // @ts-expect-error global injection
  _global[globalKey] = handler
}

export function injectHead<T extends MergeHead>() {
  if (globalKey in _global) {
    // @ts-expect-error global injection
    return _global[globalKey]() as VueHeadClient<T>
  }
  // fallback resolver
  const head = inject(headSymbol)
  if (!head && process.env.NODE_ENV !== 'production')
    console.warn('Unhead is missing Vue context, falling back to shared context. This may have unexpected results.')
  return (head || getActiveHead()) as VueHeadClient<T>
}
