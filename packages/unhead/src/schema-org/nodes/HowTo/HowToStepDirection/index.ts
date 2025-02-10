import type { Thing } from '../../../types'
import { defineSchemaOrgResolver } from '../../../util'

export interface HowToDirection extends Thing {
  /**
   * The text of the direction or tip.
   */
  text: string
}

/**
 * Describes a HowTo guide, which contains a series of steps.
 */
export const howToStepDirectionResolver = /* @__PURE__ */ defineSchemaOrgResolver<HowToDirection>({
  cast(node) {
    if (typeof node === 'string') {
      return {
        text: node,
      }
    }
    return node
  },
  defaults: {
    '@type': 'HowToDirection',
  },
})
