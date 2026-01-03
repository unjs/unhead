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

export interface PodcastSeasonSimple extends Thing {
  /**
   * The name of the podcast season.
   */
  name?: string
  /**
   * A description of the podcast season.
   */
  description?: string
  /**
   * The season number.
   */
  seasonNumber?: number
  /**
   * The number of episodes in the season.
   */
  numberOfEpisodes?: number
  /**
   * The podcast series that this season is part of.
   */
  partOfSeries?: NodeRelation<any>
  /**
   * The episodes that are part of this season.
   */
  episode?: NodeRelations<any>
  /**
   * The date the season was published.
   */
  datePublished?: ResolvableDate
  /**
   * The start date of the season.
   */
  startDate?: ResolvableDate
  /**
   * The end date of the season.
   */
  endDate?: ResolvableDate
  /**
   * An image that represents the season.
   */
  image?: NodeRelations<string | ImageObject>
  /**
   * The URL of the season.
   */
  url?: string
  /**
   * The actors in the podcast season.
   */
  actor?: NodeRelations<Person | string>
  /**
   * The directors of the podcast season.
   */
  director?: NodeRelations<Person | string>
  /**
   * The production company or studio responsible for the podcast season.
   */
  productionCompany?: NodeRelation<Organization | string>
  /**
   * Annotation for the average review score assigned to the podcast season.
   */
  aggregateRating?: NodeRelation<AggregateRating>
}

export interface PodcastSeason extends PodcastSeasonSimple {}

/**
 * Describes a season of a podcast series.
 */
export const podcastSeasonResolver = defineSchemaOrgResolver<PodcastSeason>({
  defaults: {
    '@type': 'PodcastSeason',
  },
  resolve(node, ctx) {
    node.actor = resolveRelation(node.actor, ctx, personResolver)
    node.director = resolveRelation(node.director, ctx, personResolver)
    node.productionCompany = resolveRelation(node.productionCompany, ctx, organizationResolver)
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
