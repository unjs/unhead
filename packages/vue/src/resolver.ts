import type { PropResolver } from 'unhead/types'
import { unref } from 'vue'

export const VueResolver: PropResolver = /* @__PURE__ */ Object.assign(
  // unref reads a ref and returns anything else as it is, functions included
  (_?: string, value?: any) => unref(value),
  // identity for plain non-reactive values, so SSR init entries keep
  // their precomputed fast path (see unhead/server createHead)
  { _static: true },
)
