import type { Unhead } from '@unhead/schema'
import { tryUseUnhead } from 'unhead'
import { inject } from 'vue'

import { headSymbol } from '../install'

export function injectHead() {
  // allow custom context setting
  const ctx = tryUseUnhead()
  if (ctx) {
    return ctx
  }
  // fallback to vue context
  const instance = inject<Unhead>(headSymbol)
  if (!instance) {
    throw new Error('useHead() was called without provide context, ensure you call it through the setup() function.')
  }
  return instance
}
