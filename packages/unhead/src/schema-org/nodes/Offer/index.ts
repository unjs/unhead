import type { NodeRelation, OptionalSchemaOrgPrefix, ResolvableDate, Thing } from '../../types'
import type { OfferShippingDetails } from '../OfferShippingDetails'
import type { OpeningHoursSpecification } from '../OpeningHours'
import { withBase } from 'ufo'
import { defineSchemaOrgResolver, resolvableDateToIso, resolveRelation, resolveWithBase, setIfEmpty } from '../../util'
import { merchantReturnPolicyResolver } from '../MerchantReturnPolicy'
import { offerShippingDetailsResolver } from '../OfferShippingDetails'

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

type OfferItemCondition =
  'NewCondition' |
  'RefurbishedCondition' |
  'UsedCondition'

export interface OfferSimple extends Thing {
  '@type'?: 'Offer'
  /**
   * Condition of the item offered for sale.
   */
  'itemCondition'?: OptionalSchemaOrgPrefix<OfferItemCondition>
  /**
   * A schema.org URL representing a schema itemAvailability value (e.g., https://schema.org/OutOfStock).
   */
  'availability'?: OptionalSchemaOrgPrefix<ItemAvailability>
  /**
   * The price, omitting any currency symbols, and using '.' to indicate a decimal place.
   */
  'price': number | string
  /**
   * The currency used to describe the product price, in three-letter ISO 4217 format.
   */
  'priceCurrency'?: string
  /**
   * @todo A PriceSpecification object, including a valueAddedTaxIncluded property (of either true or false).
   */
  'priceSpecification'?: unknown
  /**
   * The date after which the price is no longer available.
   */
  'priceValidUntil'?: ResolvableDate

  'url'?: string
  /**
   * Nested information about the return policies associated with an Offer. If you decide to add hasMerchantReturnPolicy, add the required and recommended MerchantReturnPolicy properties.
   */
  'hasMerchantReturnPolicy'?: NodeRelation<OpeningHoursSpecification>
  /**
   * Nested information about the shipping policies and options associated with an Offer. If you decide to add shippingDetails, add the required and recommended OfferShippingDetails properties.
   */
  'shippingDetails'?: OfferShippingDetails
}

export interface Offer extends OfferSimple {}

export const offerResolver = /* @__PURE__ */ defineSchemaOrgResolver<Offer>({
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
    if (node.itemCondition)
      node.itemCondition = withBase(node.itemCondition, 'https://schema.org/') as OfferItemCondition

    if (node.priceValidUntil)
      node.priceValidUntil = resolvableDateToIso(node.priceValidUntil)

    node.hasMerchantReturnPolicy = resolveRelation(node.hasMerchantReturnPolicy, ctx, merchantReturnPolicyResolver)
    node.shippingDetails = resolveRelation(node.shippingDetails, ctx, offerShippingDetailsResolver)
    return node
  },
})
