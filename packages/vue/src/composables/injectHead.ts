import type { MergeHead } from '@unhead/schema'
import { hasInjectionContext, inject } from 'vue'
import { injectHead as _injectHead } from 'unhead'
import type { VueHeadClient } from '../types'
import { headSymbol } from '../createHead'

export function injectHead<T extends MergeHead>() {
  // requires Vue 3.3
  if (hasInjectionContext())
    return inject<VueHeadClient<T>>(headSymbol)
  return _injectHead<VueHeadClient<T>>()
}
