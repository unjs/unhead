import type { PropResolver } from 'unhead/types'
import { isRef, toValue } from 'vue'

export const VueResolver: PropResolver = /* @__PURE__ */ (_, value: any) => {
  if (isRef(value)) {
    const unwrapped = toValue(value)
    // Preserve _resolver from the ref wrapper (used by schema-org)
    if (value._resolver && unwrapped && typeof unwrapped === 'object') {
      unwrapped.__preserved_resolver = value._resolver
    }
    return unwrapped
  }
  return value
}
