import type { NodeRelations, Thing } from '../../types'
import {
  asArray,
  setIfEmpty,
} from '../../utils'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import type { Offer } from '../Offer'
import { offerResolver } from '../Offer'

export interface AggregateOfferSimple extends Thing {
  /**
   * The lowest price of the group, omitting any currency symbols, and using '.' to indicate a decimal place.
   */
  lowPrice: number | string
  /**
   *  The highest price of the group, omitting any currency symbols, and using '.' to indicate a decimal place.
   */
  highPrice: number | string
  /**
   * The currency used to describe the product price, in a three-letter ISO 4217 format.
   */
  priceCurrency?: string
  /**
   * The number of offers in the group
   */
  offerCount?: number | string
  /**
   * An array of Offer pieces, referenced by ID.
   */
  offers?: NodeRelations<Offer>
}

export interface AggregateOffer extends AggregateOfferSimple {}

export const aggregateOfferResolver = defineSchemaOrgResolver<AggregateOffer>({
  defaults: {
    '@type': 'AggregateOffer',
  },
  inheritMeta: [
    { meta: 'currency', key: 'priceCurrency' },
  ],
  resolve(node, ctx) {
    node.offers = resolveRelation(node.offers, ctx, offerResolver)
    if (node.offers)
      setIfEmpty(node, 'offerCount', asArray(node.offers).length)
    return node
  },
})
