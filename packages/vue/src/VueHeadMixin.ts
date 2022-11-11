import { getCurrentInstance } from 'vue'
import { useHead } from '.'

export const VueHeadMixin = {
  created() {
    const instance = getCurrentInstance()
    if (!instance)
      return

    const options = instance.type
    if (!options || !('head' in options))
      return

    const source = typeof options.head === 'function'
      ? () => options.head()
      : options.head

    useHead(source)
  },
}
