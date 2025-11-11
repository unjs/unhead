import type {
  NodeRelation,
  NodeRelations,
  ResolvableDate,
  Thing,
} from '../../types'
import type { ImageObject } from '../Image'
import { defineSchemaOrgResolver } from '../../core'
import { resolvableDateToIso } from '../../utils'

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
}

export interface PodcastSeason extends PodcastSeasonSimple {}

/**
 * Describes a season of a podcast series.
 */
export const podcastSeasonResolver = defineSchemaOrgResolver<PodcastSeason>({
  defaults: {
    '@type': 'PodcastSeason',
  },
  resolve(node, _ctx) {
    if (node.datePublished)
      node.datePublished = resolvableDateToIso(node.datePublished)
    if (node.startDate)
      node.startDate = resolvableDateToIso(node.startDate)
    if (node.endDate)
      node.endDate = resolvableDateToIso(node.endDate)

    return node
  },
})
