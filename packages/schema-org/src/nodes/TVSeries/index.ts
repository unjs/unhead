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

export interface TVSeriesSimple extends Thing {
  /**
   * The name of the TV series.
   */
  name: string
  /**
   * A description of the TV series.
   */
  description?: string
  /**
   * An image that represents the TV series.
   */
  image?: NodeRelations<string | ImageObject>
  /**
   * The URL of the TV series.
   */
  url?: string
  /**
   * The actors in the TV series.
   */
  actor?: NodeRelations<Person | string>
  /**
   * The directors of the TV series.
   */
  director?: NodeRelations<Person | string>
  /**
   * The creator of the TV series.
   */
  creator?: NodeRelations<Person | Organization | string>
  /**
   * The number of seasons in the TV series.
   */
  numberOfSeasons?: number
  /**
   * The number of episodes in the TV series.
   */
  numberOfEpisodes?: number
  /**
   * The seasons that are part of this TV series.
   */
  containsSeason?: NodeRelations<any>
  /**
   * The episodes that are part of this TV series.
   */
  episode?: NodeRelations<any>
  /**
   * The genre of the TV series.
   */
  genre?: string | string[]
  /**
   * The date the TV series was published.
   */
  datePublished?: ResolvableDate
  /**
   * The start date of the TV series.
   */
  startDate?: ResolvableDate
  /**
   * The end date of the TV series.
   */
  endDate?: ResolvableDate
  /**
   * The production company or studio responsible for the TV series.
   */
  productionCompany?: NodeRelation<Organization | string>
  /**
   * Annotation for the average review score assigned to the TV series.
   */
  aggregateRating?: NodeRelation<AggregateRating>
  /**
   * The country of origin for the TV series.
   */
  countryOfOrigin?: string
  /**
   * A trailer or preview video for the TV series.
   */
  trailer?: NodeRelation<VideoObject | string>
  /**
   * Official rating of the content (e.g., "MPAA PG-13", "TV-MA").
   */
  contentRating?: string
}

export interface TVSeries extends TVSeriesSimple {}

/**
 * Describes a TV series.
 */
export const tvSeriesResolver = defineSchemaOrgResolver<TVSeries>({
  defaults: {
    '@type': 'TVSeries',
  },
  resolve(node, ctx) {
    node.actor = resolveRelation(node.actor, ctx, personResolver)
    node.director = resolveRelation(node.director, ctx, personResolver)
    node.creator = resolveRelation(node.creator, ctx, personResolver)
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
