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
import type { VideoObject } from '../Video'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { resolvableDateToIso } from '../../utils'
import { aggregateRatingResolver } from '../AggregateRating'
import { organizationResolver } from '../Organization'
import { personResolver } from '../Person'
import { videoResolver } from '../Video'

export interface TVSeasonSimple extends Thing {
  /**
   * The name of the TV season.
   */
  name?: string
  /**
   * A description of the TV season.
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
   * The TV series that this season is part of.
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
   * The actors in the TV season.
   */
  actor?: NodeRelations<Person | string>
  /**
   * The directors of the TV season.
   */
  director?: NodeRelations<Person | string>
  /**
   * The production company or studio responsible for the TV season.
   */
  productionCompany?: NodeRelation<Organization | string>
  /**
   * Annotation for the average review score assigned to the TV season.
   */
  aggregateRating?: NodeRelation<AggregateRating>
  /**
   * Official rating of the content (e.g., "MPAA PG-13", "TV-MA").
   */
  contentRating?: string
  /**
   * A trailer or preview video for the TV season.
   */
  trailer?: NodeRelation<VideoObject | string>
}

export interface TVSeason extends TVSeasonSimple {}

/**
 * Describes a season of a TV series.
 */
export const tvSeasonResolver = defineSchemaOrgResolver<TVSeason>({
  defaults: {
    '@type': 'TVSeason',
  },
  resolve(node, ctx) {
    node.actor = resolveRelation(node.actor, ctx, personResolver)
    node.director = resolveRelation(node.director, ctx, personResolver)
    node.productionCompany = resolveRelation(node.productionCompany, ctx, organizationResolver)
    node.aggregateRating = resolveRelation(node.aggregateRating, ctx, aggregateRatingResolver)
    node.trailer = resolveRelation(node.trailer, ctx, videoResolver)

    if (node.datePublished)
      node.datePublished = resolvableDateToIso(node.datePublished)
    if (node.startDate)
      node.startDate = resolvableDateToIso(node.startDate)
    if (node.endDate)
      node.endDate = resolvableDateToIso(node.endDate)

    return node
  },
})
