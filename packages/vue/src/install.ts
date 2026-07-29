import type { Unhead } from 'unhead/types'
import type { App } from 'vue'
import type { VueHeadClient } from './types'
import { hasInjectionContext, inject } from 'vue'

export const headSymbol = 'usehead'

/* @__NO_SIDE_EFFECTS__ */
export function injectHead() {
  if (hasInjectionContext()) {
    const instance = inject<VueHeadClient>(headSymbol)
    if (instance)
      return instance
  }
  throw new Error('useHead() was called without provide context, ensure you call it through the setup() function.')
}

/* @__NO_SIDE_EFFECTS__ */
export function vueInstall<I, RenderResult>(head: Unhead<I, RenderResult>) {
  return (app: App) => {
    app.config.globalProperties.$unhead = head
    // for @vueuse/head polyfill
    app.config.globalProperties.$head = head
    app.provide(headSymbol, head)
  }
}
