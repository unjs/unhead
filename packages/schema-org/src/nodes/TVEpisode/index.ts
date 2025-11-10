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
import { resolvableDateToIso } from '../../utils'
import { aggregateRatingResolver } from '../AggregateRating'
import { personResolver } from '../Person'
import { reviewResolver } from '../Review'
import { videoResolver } from '../Video'

export interface TVEpisodeSimple extends Thing {
  /**
   * The name of the episode.
   */
  name: string
  /**
   * A description of the episode.
   */
  description?: string
  /**
   * The episode number.
   */
  episodeNumber?: number | string
  /**
   * The season that this episode is part of.
   */
  partOfSeason?: NodeRelation<any>
  /**
   * The TV series that this episode is part of.
   */
  partOfSeries?: NodeRelation<any>
  /**
   * The actors in the episode.
   */
  actor?: NodeRelations<Person | string>
  /**
   * The directors of the episode.
   */
  director?: NodeRelations<Person | string>
  /**
   * The date the episode was published.
   */
  datePublished?: ResolvableDate
  /**
   * The date the episode was uploaded.
   */
  uploadDate?: ResolvableDate
  /**
   * The duration of the episode in ISO 8601 format (e.g., PT45M).
   */
  duration?: string
  /**
   * A video object representing the episode content.
   */
  video?: NodeRelation<VideoObject | string>
  /**
   * An image that represents the episode.
   */
  image?: NodeRelations<string | ImageObject>
  /**
   * A thumbnail image for the episode.
   */
  thumbnailUrl?: string
  /**
   * The URL of the episode.
   */
  url?: string
  /**
   * Annotation for the average review score assigned to the episode.
   */
  aggregateRating?: NodeRelation<AggregateRating>
  /**
   * A nested Review of the episode.
   */
  review?: NodeRelations<Review>
}

export interface TVEpisode extends TVEpisodeSimple {}

/**
 * Describes an episode of a TV series.
 */
export const tvEpisodeResolver = defineSchemaOrgResolver<TVEpisode>({
  defaults: {
    '@type': 'TVEpisode',
  },
  resolve(node, ctx) {
    node.actor = resolveRelation(node.actor, ctx, personResolver)
    node.director = resolveRelation(node.director, ctx, personResolver)
    node.video = resolveRelation(node.video, ctx, videoResolver)
    node.aggregateRating = resolveRelation(node.aggregateRating, ctx, aggregateRatingResolver)
    node.review = resolveRelation(node.review, ctx, reviewResolver)

    if (node.datePublished)
      node.datePublished = resolvableDateToIso(node.datePublished)
    if (node.uploadDate)
      node.uploadDate = resolvableDateToIso(node.uploadDate)

    return node
  },
})
