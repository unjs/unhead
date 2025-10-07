import type { PropResolver } from 'unhead/types'
import { isRef, toValue } from 'vue'

export const VueResolver: PropResolver = /* @__PURE__ */ (_, value: any) => {
  return isRef(value) ? toValue(value) : value
}
