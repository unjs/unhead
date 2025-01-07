import type { Plugin } from 'vue'
import { useHead } from '../composables/useHead'
import { headSymbol } from '../createHead'

export const UnheadPlugin: Plugin = (_Vue) => {
  _Vue.config.optionMergeStrategies.head = function (toVal, fromVal) {
    return [toVal, fromVal].flat().filter(Boolean) // resolve from created()
  }
  // copied from https://github.com/vuejs/pinia/blob/v2/packages/pinia/src/vue2-plugin.ts
  _Vue.mixin({
    created() {
      const head = this.$options.head
      if (head) {
        if (Array.isArray(head)) {
          head.forEach((h) => {
            useHead(typeof h === 'function' ? h.call(this) : h)
          })
        }
        else {
          useHead(typeof head === 'function' ? head.call(this) : head)
        }
      }
    },

    beforeCreate() {
      const options = this.$options
      if (options.unhead) {
        const origProvide = options.provide
        options.provide = function () {
          let origProvideResult
          if (typeof origProvide === 'function')
            origProvideResult = origProvide.call(this)
          else
            origProvideResult = origProvide || {}

          return {
            ...origProvideResult,
            [headSymbol]: options.unhead,
          }
        }
      }
    },
  })
}
