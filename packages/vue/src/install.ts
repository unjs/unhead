import type { Plugin } from 'vue'
import type { VueHeadClient } from './types'

export const headSymbol = 'usehead'

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
