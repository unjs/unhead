import { isRef, toValue } from 'vue'

export function VuePropResolver(_, value) {
  if (isRef(value)) {
    return toValue(value)
  }
}
