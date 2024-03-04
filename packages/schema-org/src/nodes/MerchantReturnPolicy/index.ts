import { withBase } from 'ufo'
import type { OptionalSchemaOrgPrefix, Thing } from '../../types'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import type { MonetaryAmount } from '../MonetaryAmount'
import { monetaryAmountResolver } from '../MonetaryAmount'

type MerchantReturnEnumeration =
  'MerchantReturnFiniteReturnWindow'
  | 'MerchantReturnNotPermitted'
  | 'MerchantReturnUnlimitedWindow'

type ReturnFeesEnumeration = 'FreeReturn' | 'ReturnFeesCustomerResponsibility' | 'ReturnShippingFees'

type ReturnMethodEnumeration = 'ReturnAtKiosk' | 'ReturnByMail' | 'ReturnInStore'

export interface MerchantReturnPolicySimple extends Thing {
  '@type'?: 'MerchantReturnPolicy'
  /**
   * The country code that the return policy applies to, using the two-letter ISO 3166-1 alpha-2 country code formatting. You can specify up to 50 countries.
   */
  'applicableCountry': string
  /**
   * The type of return policy.
   */
  'returnPolicyCategory': OptionalSchemaOrgPrefix<MerchantReturnEnumeration>
  /**
   * The number of days from the delivery date that a product can be returned. This property is only required if you set the returnPolicyCategory to MerchantReturnFiniteReturnWindow.
   */
  'merchantReturnDays'?: number
  /**
   * The type of return fees.
   */
  'returnFees'?: OptionalSchemaOrgPrefix<ReturnFeesEnumeration>
  /**
   * The type of return method offered. This is only recommended if you set the returnPolicyCategory to either MerchantReturnFiniteReturnWindow or MerchantReturnUnlimitedWindow.
   */
  'returnMethod'?: OptionalSchemaOrgPrefix<ReturnMethodEnumeration>
  /**
   * The cost of shipping for returning a product. This property is only required if there's a non-zero shipping fee to
   * be paid by the consumer to the merchant to return a product, in which case returnFees must be set to
   * https://schema.org/ReturnShippingFees).
   * If the return is free, returnFees must be set to https://schema.org/FreeReturn.
   * If the consumer needs to handle, and pay for, the return shipping cost, returnFees must be set to https://schema.org/ReturnFeesCustomerResponsibility.
   */
  'returnShippingFeesAmount'?: MonetaryAmount
}

export interface MerchantReturnPolicy extends MerchantReturnPolicySimple {}

export const merchantReturnPolicyResolver = defineSchemaOrgResolver<MerchantReturnPolicy>({
  defaults: {
    '@type': 'MerchantReturnPolicy',
  },
  resolve(node, ctx) {
    if (node.returnPolicyCategory)
      node.returnPolicyCategory = withBase(node.returnPolicyCategory, 'https://schema.org/') as MerchantReturnEnumeration
    if (node.returnFees)
      node.returnFees = withBase(node.returnFees, 'https://schema.org/') as ReturnFeesEnumeration
    if (node.returnMethod)
      node.returnMethod = withBase(node.returnMethod, 'https://schema.org/') as ReturnMethodEnumeration
    node.returnShippingFeesAmount = resolveRelation(node.returnShippingFeesAmount, ctx, monetaryAmountResolver)
    return node
  },
})
