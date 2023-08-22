import { withBase } from 'ufo'
import type { OptionalSchemaOrgPrefix, ResolvableDate, Thing } from '../../types'
import {
  resolvableDateToIso, resolveWithBase, setIfEmpty,
} from '../../utils'
import { defineSchemaOrgResolver } from '../../core'

type ItemAvailability =
  'BackOrder' |
  'Discontinued' |
  'InStock' |
  'InStoreOnly' |
  'LimitedAvailability' |
  'OnlineOnly' |
  'OutOfStock' |
  'PreOrder' |
  'PreSale' |
  'SoldOut'

export interface OfferSimple extends Thing {
  '@type'?: 'Offer'
  /**
   * A schema.org URL representing a schema itemAvailability value (e.g., https://schema.org/OutOfStock).
   */
  availability?: OptionalSchemaOrgPrefix<ItemAvailability>
  /**
   * The price, omitting any currency symbols, and using '.' to indicate a decimal place.
   */
  price: number | string
  /**
   * The currency used to describe the product price, in three-letter ISO 4217 format.
   */
  priceCurrency?: string
  /**
   * @todo A PriceSpecification object, including a valueAddedTaxIncluded property (of either true or false).
   */
  priceSpecification?: unknown
  /**
   * The date after which the price is no longer available.
   */
  priceValidUntil?: ResolvableDate

  url?: string
}

export interface Offer extends OfferSimple {}

export const offerResolver = defineSchemaOrgResolver<Offer>({
  cast(node) {
    if (typeof node === 'number' || typeof node === 'string') {
      return {
        price: node,
      }
    }
    return node
  },
  defaults: {
    '@type': 'Offer',
    'availability': 'InStock',
  },
  resolve(node, ctx) {
    setIfEmpty(node, 'priceCurrency', ctx.meta.currency)
    setIfEmpty(node, 'priceValidUntil', new Date(Date.UTC(new Date().getFullYear() + 1, 12, -1, 0, 0, 0)))
    if (node.url)
      resolveWithBase(ctx.meta.host, node.url)

    if (node.availability)
      node.availability = withBase(node.availability, 'https://schema.org/') as ItemAvailability

    if (node.priceValidUntil)
      node.priceValidUntil = resolvableDateToIso(node.priceValidUntil)
    return node
  },
})
