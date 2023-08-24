import type {
  NodeRelation,
  NodeRelations,
  ResolvableDate,
  Thing,
} from '../../types'
import { resolvableDateToDate } from '../../utils'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import type { ImageObject } from '../Image'
import type { AggregateRating } from '../AggregateRating'
import { aggregateRatingResolver } from '../AggregateRating'
import type { Person } from '../Person'
import { personResolver } from '../Person'
import type { Review } from '../Review'
import { reviewResolver } from '../Review'
import type { VideoObject } from '../Video'
import { videoResolver } from '../Video'

export interface MovieSimple extends Thing {
  /**
   * An image that represents the movie.
   */
  image: NodeRelations<string | ImageObject>
  /**
   * The name of the movie.
   */
  name: string
  /**
   * Annotation for the average review score assigned to the movie.
   */
  aggregateRating?: NodeRelation<AggregateRating>
  /**
   * The date the movie was released.
   */
  dateCreated?: ResolvableDate
  /**
   * The director of the movie.
   */
  director?: NodeRelations<Person | string>
  /**
   * The director of the movie.
   */
  actor?: NodeRelations<Person | string>
  /**
   * A nested Review of the movie.
   */
  review?: NodeRelations<Review>
  /**
   * The trailer of a movie or TV/radio series, season, episode, etc.
   */
  trailer?: NodeRelations<string | VideoObject>
}

export interface Movie extends MovieSimple {}

export const movieResolver = defineSchemaOrgResolver<Movie>({
  defaults: {
    '@type': 'Movie',
  },
  resolve(node, ctx) {
    node.aggregateRating = resolveRelation(node.aggregateRating, ctx, aggregateRatingResolver)
    node.review = resolveRelation(node.review, ctx, reviewResolver)
    node.director = resolveRelation(node.director, ctx, personResolver)
    node.actor = resolveRelation(node.actor, ctx, personResolver)
    node.trailer = resolveRelation(node.trailer, ctx, videoResolver)
    if (node.dateCreated)
      node.dateCreated = resolvableDateToDate(node.dateCreated)
    return node
  },
})
