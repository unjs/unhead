import type { UseHeadInput } from './types'
import { getCurrentInstance } from 'vue'
import { useHead } from './composables'

export const VueHeadMixin = {
  created() {
    let source: UseHeadInput | false = false
    const instance = getCurrentInstance()
    if (!instance)
      return
    const options = instance.type
    if (!options || !('head' in options))
      return

    source = (typeof options.head === 'function'
      ? () => options.head.call(instance.proxy)
      : options.head) as UseHeadInput | false
    source && useHead(source)
  },
}
