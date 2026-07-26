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
  value: number | `${number}` | QuantitativeValue
}

export interface MonetaryAmount extends MonetaryAmountSimple {}

export interface QuantitativeSimple extends Thing {
  value?: number
  minValue?: number
  maxValue?: number
  unitCode?: string
  unitText?: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
}

export interface QuantitativeValue extends QuantitativeSimple {}

export const quantitativeValueResolver = defineSchemaOrgResolver<QuantitativeValue, QuantitativeValue | number>({
  cast(node) {
    if (typeof node === 'number') {
      return {
        value: node,
      }
    }
    return node
  },
  defaults: {
    '@type': 'QuantitativeValue',
  },
})

export const monetaryAmountResolver = defineSchemaOrgResolver<MonetaryAmount>({
  defaults: {
    '@type': 'MonetaryAmount',
  },
  resolve(node, ctx) {
    if (typeof node.value === 'object')
      node.value = resolveRelation(node.value, ctx, quantitativeValueResolver)
    return node
  },
})
