import type { Thing } from '../../types'
import type { DefinedRegion } from '../DefinedRegion'
import type { MonetaryAmount } from '../MonetaryAmount'
import type { ShippingDeliveryTime } from '../ShippingDeliveryTime'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { definedRegionResolver } from '../DefinedRegion'
import { monetaryAmountResolver } from '../MonetaryAmount'
import { shippingDeliveryTimeResolver } from '../ShippingDeliveryTime'

export interface OfferShippingDetails extends Thing {
  '@type'?: 'OfferShippingDetails'
  /**
   * The total delay between the receipt of the order and the goods reaching the final customer.
   */
  'deliveryTime': ShippingDeliveryTime
  'shippingDestination': DefinedRegion
  /**
   * Information about the cost of shipping to the specified destination. At least one of shippingRate.value or shippingRate.maxValue must be specified, along with shippingRate.currency.
   *
   * You can only specify one shippingRate per OfferShippingDetails property. To indicate multiple rates for your product, specify multiple OfferShippingDetail properties.
   */
  'shippingRate': MonetaryAmount
}

export const offerShippingDetailsResolver = defineSchemaOrgResolver<OfferShippingDetails>({
  defaults: {
    '@type': 'OfferShippingDetails',
  },
  resolve(node, ctx) {
    node.deliveryTime = resolveRelation(node.deliveryTime, ctx, shippingDeliveryTimeResolver)
    node.shippingDestination = resolveRelation(node.shippingDestination, ctx, definedRegionResolver)
    node.shippingRate = resolveRelation(node.shippingRate, ctx, monetaryAmountResolver)
    return node
  },
})
