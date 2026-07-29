import type { NodeRelation, Thing } from '../../types'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'

interface MonetaryAmountBase extends Thing {
  /**
   * The currency in which the monetary amount is expressed.
   */
  currency: string

}

type MonetaryAmountValue
  = | {
    value: number | `${number}` | QuantitativeValue
    minValue?: number | `${number}`
    maxValue?: number | `${number}`
  }
  | {
    value?: never
    minValue: number | `${number}`
    maxValue?: number | `${number}`
  }
  | {
    value?: never
    minValue?: number | `${number}`
    maxValue: number | `${number}`
  }

export type MonetaryAmountSimple = MonetaryAmountBase & MonetaryAmountValue
export type MonetaryAmount = MonetaryAmountSimple

export interface QuantitativeSimple extends Thing {
  value?: number | `${number}`
  minValue?: number
  maxValue?: number
  unitCode?: string
  unitText?: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
  valueReference?: NodeRelation<QuantitativeValue>
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
  resolve(node, ctx) {
    node.valueReference = resolveRelation(node.valueReference, ctx, quantitativeValueResolver)
    return node
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
