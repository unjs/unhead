import type { MergeHead } from '@unhead/schema'
import { inject } from 'vue'
import { getActiveHead } from 'unhead'
import type { VueHeadClient } from '../types'
import { headSymbol } from '../createHead'

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

const globalKey = '__unhead_failed_injection_handler__'

export function setFailedInjectionHandler(handler: () => void) {
  // @ts-expect-error global injection
  _global[globalKey] = handler
}

function callFailedInjectHandler() {
  if (globalKey in _global)
    // @ts-expect-error global injection
    return _global[globalKey]()
  if (process.env.NODE_ENV !== 'production')
    console.warn('Unhead is missing Vue context, falling back to shared context. This may have unexpected results.')
}

export function injectHead<T extends MergeHead>() {
  const injectedHead = inject(headSymbol)
  // Vue warnings were thrown
  !injectedHead && callFailedInjectHandler()
  return (injectedHead || getActiveHead()) as VueHeadClient<T>
}
