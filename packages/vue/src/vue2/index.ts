import { getCurrentInstance } from 'vue'
import type { Plugin } from 'vue'
import { headSymbol } from '../createHead'
import { useHead } from '../composables/useHead'
import { Vue3 } from '../env'

export const UnheadPlugin: Plugin = (_Vue) => {
  // copied from https://github.com/vuejs/pinia/blob/v2/packages/pinia/src/vue2-plugin.ts
  _Vue.mixin({
    created() {
      let source = false
      if (Vue3) {
        const instance = getCurrentInstance()
        if (!instance)
          return
        const options = instance.type
        if (!options || !('head' in options))
          return

        source = typeof options.head === 'function'
          ? () => options.head.call(instance.proxy)
          : options.head
      }
      else {
        const head = this.$options.head
        if (head) {
          source = typeof head === 'function'
            ? () => head.call(this)
            : head
        }
      }

      // @ts-expect-error vue 2
      source && useHead(source)
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
