import type { Unhead } from 'unhead/types'
import { createContext } from 'react'

export const UnheadContext = /* @__PURE__ */ createContext<Unhead | null>(null)

/**
 * React contexts cannot express the render-result type existentially. Keep the
 * erasure at this single boundary so provider APIs can preserve it everywhere
 * else.
 *
 * @internal
 */
export function toUnheadContextValue<Input, RenderResult>(head: Unhead<Input, RenderResult>): Unhead {
  return head as unknown as Unhead
}
