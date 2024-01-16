import { getCurrentInstance } from 'vue'
import { Vue3 } from './env'
import { useHead } from '.'


export const VueHeadMixin = {
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
