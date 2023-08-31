import type { MergeHead } from '@unhead/schema'
import { hasInjectionContext, inject } from 'vue'
import { getActiveHead } from 'unhead'
import type { VueHeadClient } from '../types'
import { headSymbol } from '../createHead'

export function injectHead<T extends MergeHead>() {
  return ((hasInjectionContext() && inject(headSymbol)) || getActiveHead()) as VueHeadClient<T>
}
