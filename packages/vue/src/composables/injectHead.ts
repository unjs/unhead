import type { Unhead } from '@unhead/schema'
import { hasInjectionContext, inject } from 'vue'
import { headSymbol } from '../install'

export function injectHead() {
  if (hasInjectionContext()) {
    // fallback to vue context
    const instance = inject<Unhead>(headSymbol)
    if (!instance) {
      throw new Error('useHead() was called without provide context, ensure you call it through the setup() function.')
    }
    return instance
  }
  throw new Error('useHead() was called without provide context, ensure you call it through the setup() function.')
}
