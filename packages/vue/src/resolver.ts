import type { PropResolver } from 'unhead/types'
import { isRef, toValue } from 'vue'

const refResolvers = new WeakMap<object, unknown>()

/** @internal */
export function setVueRefResolver(ref: object, resolver: unknown): void {
  refResolvers.set(ref, resolver)
}

export const VueResolver: PropResolver = /* @__PURE__ */ Object.assign(
  (_: string | undefined = undefined, value?: unknown) => {
    if (!isRef(value))
      return value

    const resolved = toValue(value)
    const resolver = (value as typeof value & { _resolver?: unknown })._resolver || refResolvers.get(value)
    if (resolver && resolved && typeof resolved === 'object') {
      return {
        ...(resolved as Record<string, unknown>),
        _resolver: resolver,
      }
    }
    return resolved
  },
  // identity for plain non-reactive values, so the SSR default init entry
  // keeps its precomputed fast path (see unhead/server createHead)
  { _static: true },
)
