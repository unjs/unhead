import type { Thing } from '../../types'
import { defineSchemaOrgResolver, resolveRelation } from '../../util'

export interface MonetaryAmountSimple extends Thing {
  /**
   * The currency in which the monetary amount is expressed.
   */
  currency: string

  /**
   * The value of the quantitative value or property value node.
   */
  value: number | QuantitativeValue
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

export const quantitativeValueResolver = /* @__PURE__ */ defineSchemaOrgResolver<QuantitativeValue>({
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

export const monetaryAmountResolver = /* @__PURE__ */ defineSchemaOrgResolver<MonetaryAmount>({
  defaults: {
    '@type': 'MonetaryAmount',
  },
  resolve(node, ctx) {
    if (typeof node.value !== 'number')
      node.value = resolveRelation(node.value, ctx, quantitativeValueResolver)
    return node
  },
})
