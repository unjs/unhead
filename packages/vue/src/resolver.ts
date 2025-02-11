import { isRef, toValue } from 'vue'

export function VuePropResolver(_: string, value: any) {
  if (isRef(value)) {
    return toValue(value)
  }
}
