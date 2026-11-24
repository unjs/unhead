import type { Thing } from '../../types'
import { defineSchemaOrgResolver } from '../../core'
import { resolveWithBase } from '../../utils'

export interface VirtualLocationSimple extends Thing {
  '@type'?: 'VirtualLocation'
  'url': string
}

export interface VirtualLocation extends VirtualLocationSimple {}

/**
 * Describes an online location, such as the URL of an online event. A string input becomes the `url`.
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
