import type { Plugin } from 'vue'
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
export function vueInstall(head: VueHeadClient<any>) {
  const plugin = <Plugin> {
    install(app) {
      app.config.globalProperties.$unhead = head
      // for @vueuse/head polyfill
      app.config.globalProperties.$head = head
      app.provide(headSymbol, head)
    },
  }
  return plugin.install
}
