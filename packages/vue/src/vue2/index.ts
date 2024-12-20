import type { Plugin } from 'vue'
import type { UseHeadInput } from '../types'
import { defu } from 'defu'
import { getCurrentInstance } from 'vue'
import { useHead } from '../composables/useHead'
import { headSymbol } from '../createHead'
import { Vue3 } from '../env'

export const UnheadPlugin: Plugin = (_Vue) => {
  // @ts-expect-error vue3 type augments
  _Vue.config.optionMergeStrategies.head = function (toVal, fromVal, vm) {
    // resolve both from functions
    if (typeof toVal === 'function') {
      toVal = toVal.call(vm || this || _Vue)
    }
    if (typeof fromVal === 'function') {
      fromVal = fromVal.call(vm || this || _Vue)
    }
    return defu(toVal as any, fromVal as any) as unknown
  }
  // copied from https://github.com/vuejs/pinia/blob/v2/packages/pinia/src/vue2-plugin.ts
  _Vue.mixin({
    created() {
      let source: false | UseHeadInput = false
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

      if (source) {
        useHead(source)
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
