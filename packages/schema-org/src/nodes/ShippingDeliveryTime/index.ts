import type { Thing } from '../../types'
import type { QuantitativeValue } from '../MonetaryAmount'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { quantitativeValueResolver } from '../MonetaryAmount'

export interface ShippingDeliveryTime extends Thing {
  /**
   * The typical delay between the receipt of the order and the goods leaving the warehouse.
   */
  handlingTime?: QuantitativeValue
  /**
   * The typical delay between when the order has been sent for delivery and when the goods reach the final customer.
   */
  transitTime?: QuantitativeValue
}

export const shippingDeliveryTimeResolver = defineSchemaOrgResolver<ShippingDeliveryTime>({
  defaults: {
    '@type': 'ShippingDeliveryTime',
  },
  resolve(node, ctx) {
    node.handlingTime = resolveRelation(node.handlingTime, ctx, quantitativeValueResolver)
    node.transitTime = resolveRelation(node.transitTime, ctx, quantitativeValueResolver)
    return node
  },
})
