import type { NodeRelation, ResolvableDate, Thing } from '../../types'
import type { Rating } from '../Rating'
import { ratingResolver } from '../Rating'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import type { Person } from '../Person'
import { personResolver } from '../Person'

export interface ReviewSimple extends Thing {
  /**
   * A title for the review.
   */
  name?: string
  /**
   * The author of the review.
   */
  author: NodeRelation<Person | string>
  /**
   * An answer object, with a text property which contains the answer to the question.
   */
  reviewRating: NodeRelation<Rating | number>
  /**
   * The language code for the question; e.g., en-GB.
   */
  inLanguage?: string
  /**
   * The date that the review was published, in ISO 8601 date format.
   */
  datePublished?: ResolvableDate
  /**
   * The text content of the review.
   */
  reviewBody?: string
}

export interface Review extends ReviewSimple {}

export const reviewResolver = defineSchemaOrgResolver<Review>({
  defaults: {
    '@type': 'Review',
  },
  inheritMeta: [
    'inLanguage',
  ],
  resolve(review, ctx) {
    review.reviewRating = resolveRelation(review.reviewRating, ctx, ratingResolver)
    review.author = resolveRelation(review.author, ctx, personResolver)
    return review
  },
})
