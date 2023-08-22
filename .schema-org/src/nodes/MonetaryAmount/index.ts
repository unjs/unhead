import type { Thing } from '../../types'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'

export interface MonetaryAmountSimple extends Thing {
  /**
   * The currency in which the monetary amount is expressed.
   */
  currency: string

  /**
   * The value of the quantitative value or property value node.
   */
  value: QuantitativeValue
}

export interface MonetaryAmount extends MonetaryAmountSimple {}

export interface QuantitativeSimple extends Thing {
  value?: number
  minValue?: number
  maxValue?: number
  unitText: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
}

export interface QuantitativeValue extends QuantitativeSimple {}

export const quantitativeValueResolver = defineSchemaOrgResolver<QuantitativeValue>({
  defaults: {
    '@type': 'QuantitativeValue',
  },
})

export const monetaryAmountResolver = defineSchemaOrgResolver<MonetaryAmount>({
  defaults: {
    '@type': 'MonetaryAmount',
  },
  resolve(node, ctx) {
    node.value = resolveRelation(node.value, ctx, quantitativeValueResolver)
    return node
  },
})
