import type { NodeRelation, Thing } from '../../types'
import type { PostalAddress } from '../PostalAddress'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { resolveWithBase } from '../../utils'
import { addressResolver } from '../PostalAddress'

export interface PlaceSimple extends Thing {
  '@type'?: 'Place'
  'name': string
  'address': NodeRelation<PostalAddress | string>
  'latitude'?: number | string
  'longitude'?: number | string
  /**
   * The URL of the place, e.g. the venue's page. A relative path is resolved against the site host.
   */
  'url'?: string
}

export interface Place extends PlaceSimple {}

/**
 * Describes a HowTo guide, which contains a series of steps.
 */
export const placeResolver = defineSchemaOrgResolver<Place>({
  defaults: {
    '@type': 'Place',
  },
  resolve(node, ctx) {
    if (typeof node.address !== 'string')
      node.address = resolveRelation(node.address, ctx, addressResolver)
    if (node.url)
      node.url = resolveWithBase(ctx.meta.host, node.url)
    return node
  },
})
