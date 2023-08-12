import { getCurrentInstance } from 'vue'
import { useHead } from '.'

// TODO export under own subdirectory (vue2)
export const VueHeadMixin = {
  created() {
    const instance = getCurrentInstance()
    if (!instance)
      return

    const options = instance.type
    if (!options || !('head' in options))
      return

    const source = typeof options.head === 'function'
      ? () => options.head.call(instance.proxy)
      : options.head

    useHead(source)
  },
}
