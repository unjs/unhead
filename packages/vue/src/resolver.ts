import type { PropResolver } from 'unhead/types'
import { isRef, toValue } from 'vue'

export const VueResolver: PropResolver = (_, value: any) => {
  return isRef(value) ? toValue(value) : value
}
