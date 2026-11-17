import type { App } from 'vue'
import type { VueHeadClient } from './types'
import { hasInjectionContext, inject } from 'vue'

export const headSymbol = 'usehead'

/* @__NO_SIDE_EFFECTS__ */
export function injectHead() {
  const instance = hasInjectionContext() && inject<VueHeadClient>(headSymbol)
  if (instance)
    return instance
  throw new Error('useHead() was called without provide context, ensure you call it through the setup() function.')
}

/* @__NO_SIDE_EFFECTS__ */
export function vueInstall(head: VueHeadClient<any>): (app: App) => void {
  return (app) => {
    // `$head` is for the @vueuse/head polyfill
    app.config.globalProperties.$unhead = app.config.globalProperties.$head = head
    app.provide(headSymbol, head)
  }
}
