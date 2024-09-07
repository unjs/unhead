import { defineSchemaOrgResolver } from '../../core'
import type { Thing } from '../../types'

export interface VirtualLocationSimple extends Thing {
  '@type'?: 'VirtualLocation'
  'url': string
}

export interface VirtualLocation extends VirtualLocationSimple {}

/**
 * Describes a HowTo guide, which contains a series of steps.
 */
export const virtualLocationResolver = defineSchemaOrgResolver<VirtualLocation>({
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
