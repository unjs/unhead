import type { MergeHead } from '@unhead/schema'
import { inject } from 'vue'
import { getActiveHead } from 'unhead'
import type { VueHeadClient } from '../types'
import { headSymbol } from '../createHead'

export function injectHead<T extends MergeHead>() {
  return (inject(headSymbol) || getActiveHead()) as VueHeadClient<T>
}
