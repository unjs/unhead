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

const globalKey = '__unhead_injection_handler__'

export function setHeadInjectionHandler(handler: () => VueHeadClient<any> | undefined) {
  // @ts-expect-error global injection
  _global[globalKey] = handler
}

export function injectHead<T extends MergeHead>() {
  let head: VueHeadClient<T> | undefined
  if (globalKey in _global)
    // @ts-expect-error global injection
    head = _global[globalKey]()
  if (head)
    return head
  // fallback resolver
  head = inject(headSymbol)
  if (!head && process.env.NODE_ENV !== 'production')
    console.warn('Unhead is missing Vue context, falling back to shared context. This may have unexpected results.')
  return (head || getActiveHead()) as VueHeadClient<T>
}
