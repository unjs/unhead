import type { NodeRelation, NodeRelations, OptionalSchemaOrgPrefix, ResolvableDate, Thing } from '../../types'
import type { MerchantReturnPolicy } from '../MerchantReturnPolicy'
import type { QuantitativeValue } from '../MonetaryAmount'
import type { OfferShippingDetails } from '../OfferShippingDetails'
import type { MemberProgramTier } from '../Organization'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import {
  resolvableDateToIso,
  resolveWithBase,
  setIfEmpty,
  withBase,
} from '../../utils'
import { merchantReturnPolicyResolver } from '../MerchantReturnPolicy'
import { quantitativeValueResolver } from '../MonetaryAmount'
import { offerShippingDetailsResolver } from '../OfferShippingDetails'
import { memberProgramTierResolver } from '../Organization'

type ItemAvailability
  = 'BackOrder'
    | 'Discontinued'
    | 'InStock'
    | 'InStoreOnly'
    | 'LimitedAvailability'
    | 'OnlineOnly'
    | 'OutOfStock'
    | 'PreOrder'
    | 'PreSale'
    | 'SoldOut'

type OfferItemCondition
  = 'NewCondition'
    | 'RefurbishedCondition'
    | 'UsedCondition'

interface UnitPriceSpecificationBase extends Thing {
  '@type'?: 'UnitPriceSpecification'
  'billingDuration'?: number
  'billingIncrement'?: number
  'priceCurrency'?: string
  'referenceQuantity'?: NodeRelation<QuantitativeValue>
  'unitCode'?: string
  'validFrom'?: ResolvableDate
  'validThrough'?: ResolvableDate
  'valueAddedTaxIncluded'?: boolean
}

type UnitPriceSpecificationKind
  = | {
    price: number | string
    priceType?: never
    validForMemberTier?: never
    membershipPointsEarned?: never
  }
  | {
    price: number | string
    priceType: OptionalSchemaOrgPrefix<'StrikethroughPrice'>
    validForMemberTier?: never
    membershipPointsEarned?: never
  }
  | ({
    priceType?: never
    validForMemberTier: NodeRelations<MemberProgramTier>
  } & (
    | {
      price: number | string
      membershipPointsEarned?: number
    }
    | {
      price?: never
      membershipPointsEarned: number
    }
  ))

export type UnitPriceSpecification = UnitPriceSpecificationBase & UnitPriceSpecificationKind

interface OfferBase extends Thing {
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
   * The currency used to describe the product price, in three-letter ISO 4217 format.
   */
  'priceCurrency'?: string
  /**
   * The date after which the price is no longer available.
   */
  'priceValidUntil'?: ResolvableDate
  /**
   * The date when the offer becomes valid.
   */
  'validFrom'?: ResolvableDate
  'url'?: string
  /**
   * Nested information about the return policies associated with an Offer. If you decide to add hasMerchantReturnPolicy, add the required and recommended MerchantReturnPolicy properties.
   */
  'hasMerchantReturnPolicy'?: NodeRelation<MerchantReturnPolicy>
  /**
   * Nested information about the shipping policies and options associated with an Offer. If you decide to add shippingDetails, add the required and recommended OfferShippingDetails properties.
   */
  'shippingDetails'?: NodeRelations<OfferShippingDetails>
}

type OfferPrice
  = | {
    price: number | string
    priceSpecification?: NodeRelations<UnitPriceSpecification>
  }
  | {
    price?: number | string
    priceSpecification: NodeRelations<UnitPriceSpecification>
  }

export type OfferSimple = OfferBase & OfferPrice
export type Offer = OfferSimple

const unitPriceSpecificationResolver = defineSchemaOrgResolver<UnitPriceSpecification>({
  defaults: {
    '@type': 'UnitPriceSpecification',
  },
  resolve(node, ctx) {
    if (node.price !== undefined)
      setIfEmpty(node, 'priceCurrency', ctx.meta.currency)
    if (node.priceType)
      node.priceType = withBase(node.priceType, 'https://schema.org/') as NonNullable<UnitPriceSpecification['priceType']>
    node.referenceQuantity = resolveRelation(node.referenceQuantity, ctx, quantitativeValueResolver)
    node.validForMemberTier = resolveRelation(node.validForMemberTier, ctx, memberProgramTierResolver)
    node.validFrom = resolvableDateToIso(node.validFrom)
    node.validThrough = resolvableDateToIso(node.validThrough)
    return node
  },
})

export const offerResolver = defineSchemaOrgResolver<Offer, Offer | number | string>({
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
      node.url = resolveWithBase(ctx.meta.host, node.url)

    if (node.availability)
      node.availability = withBase(node.availability, 'https://schema.org/') as ItemAvailability
    if (node.itemCondition)
      node.itemCondition = withBase(node.itemCondition, 'https://schema.org/') as OfferItemCondition

    if (node.priceValidUntil)
      node.priceValidUntil = resolvableDateToIso(node.priceValidUntil)
    node.validFrom = resolvableDateToIso(node.validFrom)

    node.hasMerchantReturnPolicy = resolveRelation(node.hasMerchantReturnPolicy, ctx, merchantReturnPolicyResolver)
    node.priceSpecification = resolveRelation(node.priceSpecification, ctx, unitPriceSpecificationResolver)
    node.shippingDetails = resolveRelation(node.shippingDetails, ctx, offerShippingDetailsResolver)
    return node
  },
})
