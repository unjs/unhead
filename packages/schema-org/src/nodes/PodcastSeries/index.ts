import type {
  NodeRelation,
  NodeRelations,
  ResolvableDate,
  Thing,
} from '../../types'
import type { AggregateRating } from '../AggregateRating'
import type { ImageObject } from '../Image'
import type { Organization } from '../Organization'
import type { Person } from '../Person'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { resolvableDateToIso } from '../../utils'
import { aggregateRatingResolver } from '../AggregateRating'
import { organizationResolver } from '../Organization'
import { personResolver } from '../Person'

export interface PodcastSeriesSimple extends Thing {
  /**
   * The name of the podcast.
   */
  name: string
  /**
   * A description of the podcast.
   */
  description?: string
  /**
   * An image that represents the podcast.
   */
  image?: NodeRelations<string | ImageObject>
  /**
   * The URL of the podcast.
   */
  url?: string
  /**
   * The author/creator of the podcast.
   */
  author?: NodeRelations<Person | Organization | string>
  /**
   * The URL of the podcast RSS feed.
   */
  webFeed?: string
  /**
   * The episodes that are part of this podcast series.
   */
  episode?: NodeRelations<any>
  /**
   * The seasons that are part of this podcast series.
   */
  containsSeason?: NodeRelations<any>
  /**
   * The number of episodes in the podcast series.
   */
  numberOfEpisodes?: number
  /**
   * The number of seasons in the podcast series.
   */
  numberOfSeasons?: number
  /**
   * The genre of the podcast.
   */
  genre?: string | string[]
  /**
   * The date the podcast was published.
   */
  datePublished?: ResolvableDate
  /**
   * The start date of the podcast.
   */
  startDate?: ResolvableDate
  /**
   * The end date of the podcast (if no longer active).
   */
  endDate?: ResolvableDate
  /**
   * Annotation for the average review score assigned to the podcast.
   */
  aggregateRating?: NodeRelation<AggregateRating>
}

export interface PodcastSeries extends PodcastSeriesSimple {}

/**
 * Describes a podcast series.
 */
export const podcastSeriesResolver = defineSchemaOrgResolver<PodcastSeries>({
  defaults: {
    '@type': 'PodcastSeries',
  },
  resolve(node, ctx) {
    node.author = resolveRelation(node.author, ctx, personResolver)
    node.aggregateRating = resolveRelation(node.aggregateRating, ctx, aggregateRatingResolver)

    if (node.datePublished)
      node.datePublished = resolvableDateToIso(node.datePublished)
    if (node.startDate)
      node.startDate = resolvableDateToIso(node.startDate)
    if (node.endDate)
      node.endDate = resolvableDateToIso(node.endDate)

    return node
  },
})
