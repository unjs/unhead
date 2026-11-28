import type { Thing } from '../../types'
import { defineSchemaOrgResolver } from '../../core'
import { setIfEmpty } from '../../utils'

export interface RatingSimple extends Thing {
  '@type'?: 'Rating'
  /**
   * A numerical quality rating for the item, either a number, fraction, or percentage
   * (for example, "4", "60%", or "6 / 10").
   * Google understands the scale for fractions and percentages,
   * since the scale is implied in the fraction itself or the percentage.
   * The default scale for numbers is a 5-point scale, where 1 is the lowest value and 5 is the highest value.
   * If another scale is intended, use bestRating and worstRating.
   */
  'ratingValue': number | string
  /**
   * The highest value allowed in this rating system. If bestRating is omitted, 5 is assumed.
   * Unhead sets 5 only when ratingValue is a number.
   */
  'bestRating'?: number | string
  /**
   * The lowest value allowed in this rating system. If worstRating is omitted, 1 is assumed.
   * Unhead sets 1 only when ratingValue is a number.
   */
  'worstRating'?: number | string
}

export interface Rating extends RatingSimple {}

export const ratingResolver = defineSchemaOrgResolver<Rating, Rating | number>({
  cast(node) {
    if (typeof node === 'number') {
      return {
        ratingValue: node,
      }
    }
    return node
  },
  defaults: {
    '@type': 'Rating',
  },
  resolve(node) {
    // A percentage or fraction such as "60%" or "6 / 10" implies its own scale.
    // Only a plain number gets Google's assumed 1 to 5 scale.
    if (isNumericRating(node.ratingValue)) {
      setIfEmpty(node, 'bestRating', 5)
      setIfEmpty(node, 'worstRating', 1)
    }
    return node
  },
})

function isNumericRating(value: unknown) {
  if (typeof value === 'number')
    return Number.isFinite(value)
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))
}
