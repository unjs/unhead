import type { Thing } from '../../types'
import { defineSchemaOrgResolver } from '../../core'
import { resolveWithBase } from '../../utils'

export interface VirtualLocationSimple extends Thing {
  '@type'?: 'VirtualLocation'
  'url': string
}

export interface VirtualLocation extends VirtualLocationSimple {}

/**
 * Describes a HowTo guide, which contains a series of steps.
 */
export const virtualLocationResolver = defineSchemaOrgResolver<VirtualLocation, VirtualLocation | string>({
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
  resolve(node, ctx) {
    if (node.url)
      node.url = resolveWithBase(ctx.meta.host, node.url)
    return node
  },
})
