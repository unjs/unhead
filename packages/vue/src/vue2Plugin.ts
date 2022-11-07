import type { Plugin } from 'vue'
import { headSymbol } from './createHead'

export const HeadVuePlugin: Plugin = function (_Vue) {
  // copied from https://github.com/vuejs/pinia/blob/v2/packages/pinia/src/vue2-plugin.ts
  _Vue.mixin({
    beforeCreate() {
      const options = this.$options
      if (options.head) {
        const origProvide = options.provide
        options.provide = function () {
          let origProvideResult
          if (typeof origProvide === 'function')
            origProvideResult = origProvide.call(this)
          else
            origProvideResult = origProvide || {}

          return {
            ...origProvideResult,
            [headSymbol as symbol]: options.head,
          }
        }

        if (!this.$head)
          this.$head = options.head
      }
      else if (!this.$head && options.parent && options.parent.$head) {
        this.$head = options.parent.$head
      }
    },
  })
}
