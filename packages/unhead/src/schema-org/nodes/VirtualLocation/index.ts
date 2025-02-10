import type { Thing } from '../../types'
import { defineSchemaOrgResolver } from '../../util'

export interface VirtualLocationSimple extends Thing {
  '@type'?: 'VirtualLocation'
  'url': string
}

export interface VirtualLocation extends VirtualLocationSimple {}

/**
 * Describes a HowTo guide, which contains a series of steps.
 */
export const virtualLocationResolver = /* @__PURE__ */ defineSchemaOrgResolver<VirtualLocation>({
  cast(node) {
    if (typeof node === 'string') {
      return {
        url: node,
      }
    }
    return node
  },
  defaults: {
    '@type': 'VirtualLocation',
  },
})
