import { getCurrentInstance } from 'vue/dist/vue'
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

export function UnheadPlugin(head: VueHeadClient<any>) {
  return {
    ...HeadOptions,
    beforeCreate() {
      // @ts-expect-error vue 2
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
  }
}
