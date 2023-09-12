import { getCurrentInstance } from 'vue'
import type { Plugin } from 'vue'
import { headSymbol } from '../createHead'
import { useHead } from '../composables/useHead'
import type { VueHeadClient } from '../types'
import { Vue3 } from '../env'

export const HeadOptions = {
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
      // @ts-expect-error vue 2
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
}

export const UnheadPlugin: Plugin = function (_Vue, head: VueHeadClient<any>) {
  // copied from https://github.com/vuejs/pinia/blob/v2/packages/pinia/src/vue2-plugin.ts
  _Vue.mixin({
    ...HeadOptions,
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
