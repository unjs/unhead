import type { Plugin } from 'vue'
import { headSymbol } from './createHead'

// TODO export under own subdirectory (vue2)
export const Vue2ProvideUnheadPlugin: Plugin = function (_Vue, head) {
  // copied from https://github.com/vuejs/pinia/blob/v2/packages/pinia/src/vue2-plugin.ts
  _Vue.mixin({
    beforeCreate() {
      const options = this.$options
      const origProvide = options.provide
      options.provide = function () {
        let origProvideResult
        if (typeof origProvide === 'function')
          origProvideResult = origProvide.call(this)
        else
          origProvideResult = origProvide || {}

        return {
          ...origProvideResult,
          [headSymbol]: head,
        }
      }
    },
  })
}
