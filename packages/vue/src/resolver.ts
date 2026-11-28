import type { PropResolver } from 'unhead/types'
import { unref } from 'vue'

export const VueResolver: PropResolver = /* @__PURE__ */ Object.assign(
  // unref reads a ref and returns anything else as it is, functions included;
  // Vue refs are always non-null objects, so skip unref for primitives and functions
  (_?: string, value?: any) => (typeof value === 'object' && value !== null ? unref(value) : value),
  // identity for plain non-reactive values, so SSR init entries keep
  // their precomputed fast path (see unhead/server createHead)
  { _static: true },
)
