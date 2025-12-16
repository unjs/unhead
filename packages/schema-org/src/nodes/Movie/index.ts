import type {
  NodeRelation,
  NodeRelations,
  ResolvableDate,
  Thing,
} from '../../types'
import type { AggregateRating } from '../AggregateRating'
import type { ImageObject } from '../Image'
import type { Person } from '../Person'
import type { Review } from '../Review'
import type { VideoObject } from '../Video'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { resolvableDateToDate } from '../../utils'
import { aggregateRatingResolver } from '../AggregateRating'
import { personResolver } from '../Person'
import { reviewResolver } from '../Review'
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
   * The actor of the movie.
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
  /**
   * The duration of the movie.
   */
  duration?: string
  /**
   * The genre of the movie.
   */
  genre?: string
  /**
   * The content rating of the movie.
   */
  contentRating?: string
  /**
   * The production company of the movie.
   */
  productionCompany?: string
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
