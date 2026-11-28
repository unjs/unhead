import type { IdReference, NodeRelation, Thing } from '../../types'
import type { DefinedRegion } from '../DefinedRegion'
import type { MonetaryAmount } from '../MonetaryAmount'
import type { ShippingDeliveryTime } from '../ShippingDeliveryTime'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { definedRegionResolver } from '../DefinedRegion'
import { monetaryAmountResolver } from '../MonetaryAmount'
import { shippingDeliveryTimeResolver } from '../ShippingDeliveryTime'

interface OfferShippingDetailsInline {
  /**
   * The total delay between the receipt of the order and the goods reaching the final customer.
   */
  deliveryTime: NodeRelation<ShippingDeliveryTime>
  shippingDestination: NodeRelation<DefinedRegion>
  /**
   * Information about the cost of shipping to the specified destination. At least one of shippingRate.value or shippingRate.maxValue must be specified, along with shippingRate.currency.
   *
   * You can only specify one shippingRate per OfferShippingDetails property. To indicate multiple rates for your product, specify multiple OfferShippingDetail properties.
   */
  shippingRate: NodeRelation<MonetaryAmount>
  hasShippingService?: never
}

/**
 * Points the offer at a ShippingService defined on the Organization. Google asks for only `hasShippingService` with an `@id` in this form.
 */
interface OfferShippingDetailsReference {
  hasShippingService: IdReference
  deliveryTime?: never
  shippingDestination?: never
  shippingRate?: never
}

export type OfferShippingDetails = Thing & { '@type'?: 'OfferShippingDetails' } & (OfferShippingDetailsInline | OfferShippingDetailsReference)

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
