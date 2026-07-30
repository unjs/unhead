import type { Identity, NodeRelation, ResolvableDate, Thing } from '../../types'
import type { ItemList } from '../ItemList'
import type { Rating } from '../Rating'
import { defineSchemaOrgResolver, resolveIdentityRelation, resolveRelation } from '../../core'
import { resolvableDateToIso } from '../../utils'
import { itemListResolver } from '../ItemList'
import { organizationResolver } from '../Organization'
import { personResolver } from '../Person'
import { ratingResolver } from '../Rating'

export interface ReviewSimple extends Thing {
  /**
   * A title for the review.
   */
  name?: string
  /**
   * The author of the review.
   */
  author: NodeRelation<Identity | string>
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
   * The date of the experience described by the review, in ISO 8601 format.
   */
  contentReferenceTime?: ResolvableDate
  /**
   * The text content of the review.
   */
  reviewBody?: string
  /**
   * The item being reviewed. Required when Review is a standalone root.
   */
  itemReviewed?: NodeRelation<Thing>
  /**
   * Positive notes about a product.
   */
  positiveNotes?: NodeRelation<ItemList>
  /**
   * Negative notes about a product.
   */
  negativeNotes?: NodeRelation<ItemList>
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
    review.author = resolveIdentityRelation(review.author as NodeRelation<Identity>, ctx, {
      organization: organizationResolver,
      person: personResolver,
    }) as NodeRelation<Identity | string>
    review.itemReviewed = resolveRelation(review.itemReviewed, ctx)
    review.negativeNotes = resolveRelation(review.negativeNotes, ctx, itemListResolver)
    review.positiveNotes = resolveRelation(review.positiveNotes, ctx, itemListResolver)
    review.contentReferenceTime = resolvableDateToIso(review.contentReferenceTime)
    review.datePublished = resolvableDateToIso(review.datePublished)
    return review
  },
})
