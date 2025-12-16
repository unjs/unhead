import type { Thing } from '../../../types'
import { defineSchemaOrgResolver } from '../../../core'

export interface HowToDirection extends Thing {
  /**
   * The text of the direction or tip.
   */
  text: string
}

/**
 * Describes the text of a direction or tip for a step in a HowTo guide.
 */
export const howToStepDirectionResolver = defineSchemaOrgResolver<HowToDirection>({
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
