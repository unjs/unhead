import type { PropResolver } from 'unhead/types'
import { isRef, toValue } from 'vue'

export const VueResolver: PropResolver = /* @__PURE__ */ Object.assign(
  (_?: string, value?: any) => isRef(value) ? toValue(value) : value,
  // identity for plain non-reactive values, so SSR init entries keep
  // their precomputed fast path (see unhead/server createHead)
  { _static: true },
)
