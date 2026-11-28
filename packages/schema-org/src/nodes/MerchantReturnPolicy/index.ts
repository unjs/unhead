import type { Arrayable, NodeRelation, NodeRelations, OptionalSchemaOrgPrefix, ResolvableDate, Thing } from '../../types'
import type { MonetaryAmount } from '../MonetaryAmount'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { resolvableDateToIso, resolveWithBase, withBase } from '../../utils'
import { monetaryAmountResolver } from '../MonetaryAmount'

type MerchantReturnEnumeration
  = 'MerchantReturnFiniteReturnWindow'
    | 'MerchantReturnNotPermitted'
    | 'MerchantReturnUnlimitedWindow'

type ReturnFeesEnumeration = 'FreeReturn' | 'ReturnFeesCustomerResponsibility' | 'ReturnShippingFees'

type ReturnMethodEnumeration = 'ReturnAtKiosk' | 'ReturnByMail' | 'ReturnInStore'

type ReturnLabelSourceEnumeration = 'ReturnLabelCustomerResponsibility' | 'ReturnLabelDownloadAndPrint' | 'ReturnLabelInBox'

type RefundTypeEnumeration = 'ExchangeRefund' | 'FullRefund' | 'StoreCreditRefund'

type ReturnItemCondition = 'DamagedCondition' | 'NewCondition' | 'RefurbishedCondition' | 'UsedCondition'

export interface MerchantReturnPolicySeasonalOverride extends Thing {
  '@type'?: 'MerchantReturnPolicySeasonalOverride'
  /**
   * The type of return policy during the season.
   */
  'returnPolicyCategory': OptionalSchemaOrgPrefix<MerchantReturnEnumeration>
  /**
   * The start date of the seasonal override.
   */
  'startDate'?: ResolvableDate
  /**
   * The end date of the seasonal override.
   */
  'endDate'?: ResolvableDate
  /**
   * The number of days, or the date, until which a product can be returned during the season.
   */
  'merchantReturnDays'?: number | ResolvableDate
}

export interface MerchantReturnPolicySimple extends Thing {
  '@type'?: 'MerchantReturnPolicy'
  /**
   * The country codes that the return policy applies to, using the two-letter ISO 3166-1 alpha-2 country code formatting. You can specify up to 50 countries.
   */
  'applicableCountry': Arrayable<string>
  /**
   * The type of return policy.
   */
  'returnPolicyCategory': OptionalSchemaOrgPrefix<MerchantReturnEnumeration>
  /**
   * The number of days from the delivery date that a product can be returned, or the date until which it can be returned.
   * This property is only required if you set the returnPolicyCategory to MerchantReturnFiniteReturnWindow.
   */
  'merchantReturnDays'?: number | ResolvableDate
  /**
   * The type of return fees.
   */
  'returnFees'?: OptionalSchemaOrgPrefix<ReturnFeesEnumeration>
  /**
   * The types of return method offered. This is only recommended if you set the returnPolicyCategory to either MerchantReturnFiniteReturnWindow or MerchantReturnUnlimitedWindow.
   */
  'returnMethod'?: Arrayable<OptionalSchemaOrgPrefix<ReturnMethodEnumeration>>
  /**
   * The cost of shipping for returning a product. This property is only required if there's a non-zero shipping fee to
   * be paid by the consumer to the merchant to return a product, in which case returnFees must be set to
   * https://schema.org/ReturnShippingFees).
   * If the return is free, returnFees must be set to https://schema.org/FreeReturn.
   * If the consumer needs to handle, and pay for, the return shipping cost, returnFees must be set to https://schema.org/ReturnFeesCustomerResponsibility.
   */
  'returnShippingFeesAmount'?: NodeRelation<MonetaryAmount>
  /**
   * The return fees when the customer changes their mind. Uses the same values as returnFees.
   */
  'customerRemorseReturnFees'?: OptionalSchemaOrgPrefix<ReturnFeesEnumeration>
  /**
   * The source of the return label when the customer changes their mind.
   */
  'customerRemorseReturnLabelSource'?: OptionalSchemaOrgPrefix<ReturnLabelSourceEnumeration>
  /**
   * The return shipping cost when the customer changes their mind. Only required for a non-zero fee.
   */
  'customerRemorseReturnShippingFeesAmount'?: NodeRelation<MonetaryAmount>
  /**
   * The return fees for a defective item. Uses the same values as returnFees.
   */
  'itemDefectReturnFees'?: OptionalSchemaOrgPrefix<ReturnFeesEnumeration>
  /**
   * The source of the return label for a defective item.
   */
  'itemDefectReturnLabelSource'?: OptionalSchemaOrgPrefix<ReturnLabelSourceEnumeration>
  /**
   * The return shipping cost for a defective item. Only required for a non-zero fee.
   */
  'itemDefectReturnShippingFeesAmount'?: NodeRelation<MonetaryAmount>
  /**
   * The conditions of items that can be returned.
   */
  'itemCondition'?: Arrayable<OptionalSchemaOrgPrefix<ReturnItemCondition>>
  /**
   * The types of refund offered.
   */
  'refundType'?: Arrayable<OptionalSchemaOrgPrefix<RefundTypeEnumeration>>
  /**
   * The restocking fee, as a monetary amount or as a number for a percentage of the price.
   */
  'restockingFee'?: number | NodeRelation<MonetaryAmount>
  /**
   * The source of the return label.
   */
  'returnLabelSource'?: OptionalSchemaOrgPrefix<ReturnLabelSourceEnumeration>
  /**
   * The country codes where the item must be returned, in ISO 3166-1 alpha-2 format. You can specify up to 50 countries.
   */
  'returnPolicyCountry'?: Arrayable<string>
  /**
   * A return policy that applies for a limited time, such as a holiday season.
   */
  'returnPolicySeasonalOverride'?: NodeRelations<MerchantReturnPolicySeasonalOverride>
  /**
   * The URL of a page that describes the return policy.
   */
  'merchantReturnLink'?: string
}

export interface MerchantReturnPolicy extends MerchantReturnPolicySimple {}

/**
 * A return policy given only as a link to the policy page. Google accepts this form at the Organization level.
 */
export interface MerchantReturnPolicyLink extends Thing {
  '@type'?: 'MerchantReturnPolicy'
  /**
   * The URL of a page that describes the return policy.
   */
  'merchantReturnLink': string
}

function withSchemaOrgBase<T extends Arrayable<string>>(value: T): T {
  return (Array.isArray(value)
    ? value.map(v => withBase(v, 'https://schema.org/'))
    : withBase(value as string, 'https://schema.org/')) as T
}

function resolveReturnDays(days: number | ResolvableDate | undefined) {
  return typeof days === 'number' ? days : resolvableDateToIso(days)
}

const merchantReturnPolicySeasonalOverrideResolver = defineSchemaOrgResolver<MerchantReturnPolicySeasonalOverride>({
  defaults: {
    '@type': 'MerchantReturnPolicySeasonalOverride',
  },
  resolve(node) {
    if (node.returnPolicyCategory)
      node.returnPolicyCategory = withSchemaOrgBase(node.returnPolicyCategory)
    node.startDate = resolvableDateToIso(node.startDate)
    node.endDate = resolvableDateToIso(node.endDate)
    node.merchantReturnDays = resolveReturnDays(node.merchantReturnDays)
    return node
  },
})

const ENUM_KEYS = [
  'returnPolicyCategory',
  'returnFees',
  'returnMethod',
  'customerRemorseReturnFees',
  'customerRemorseReturnLabelSource',
  'itemDefectReturnFees',
  'itemDefectReturnLabelSource',
  'itemCondition',
  'refundType',
  'returnLabelSource',
] as const satisfies (keyof MerchantReturnPolicy)[]

/**
 * Resolves a full policy or a link-only policy. Every field is optional at runtime, so one resolver serves both forms.
 */
export const merchantReturnPolicyResolver = defineSchemaOrgResolver<MerchantReturnPolicy>({
  defaults: {
    '@type': 'MerchantReturnPolicy',
  },
  resolve(node, ctx) {
    if (node.merchantReturnLink)
      node.merchantReturnLink = resolveWithBase(ctx.meta.host, node.merchantReturnLink)
    const policy = node as MerchantReturnPolicy
    for (const key of ENUM_KEYS) {
      if (policy[key])
        (policy as Record<string, unknown>)[key] = withSchemaOrgBase(policy[key] as Arrayable<string>)
    }
    policy.merchantReturnDays = resolveReturnDays(policy.merchantReturnDays)
    policy.returnShippingFeesAmount = resolveRelation(policy.returnShippingFeesAmount, ctx, monetaryAmountResolver)
    policy.customerRemorseReturnShippingFeesAmount = resolveRelation(policy.customerRemorseReturnShippingFeesAmount, ctx, monetaryAmountResolver)
    policy.itemDefectReturnShippingFeesAmount = resolveRelation(policy.itemDefectReturnShippingFeesAmount, ctx, monetaryAmountResolver)
    if (policy.restockingFee && typeof policy.restockingFee === 'object')
      policy.restockingFee = resolveRelation(policy.restockingFee, ctx, monetaryAmountResolver)
    policy.returnPolicySeasonalOverride = resolveRelation(policy.returnPolicySeasonalOverride, ctx, merchantReturnPolicySeasonalOverrideResolver)
    return policy
  },
})
