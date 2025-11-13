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
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { resolvableDateToIso } from '../../utils'
import { aggregateRatingResolver } from '../AggregateRating'
import { personResolver } from '../Person'
import { reviewResolver } from '../Review'

export interface PodcastEpisodeSimple extends Thing {
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
   * The podcast series that this episode is part of.
   */
  partOfSeries?: NodeRelation<any>
  /**
   * The creator/host of the episode.
   */
  author?: NodeRelations<Person | string>
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
   * The audio file URL or MediaObject for the episode.
   */
  audio?: NodeRelation<any | string>
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
   * A URL to a transcript of the episode.
   */
  transcript?: string
  /**
   * Annotation for the average review score assigned to the episode.
   */
  aggregateRating?: NodeRelation<AggregateRating>
  /**
   * A nested Review of the episode.
   */
  review?: NodeRelations<Review>
  /**
   * The language code for the episode content; e.g., en-GB.
   */
  inLanguage?: string
}

export interface PodcastEpisode extends PodcastEpisodeSimple {}

/**
 * Describes an episode of a podcast.
 */
export const podcastEpisodeResolver = defineSchemaOrgResolver<PodcastEpisode>({
  defaults: {
    '@type': 'PodcastEpisode',
  },
  inheritMeta: [
    'inLanguage',
  ],
  resolve(node, ctx) {
    node.author = resolveRelation(node.author, ctx, personResolver)
    node.aggregateRating = resolveRelation(node.aggregateRating, ctx, aggregateRatingResolver)
    node.review = resolveRelation(node.review, ctx, reviewResolver)

    if (node.datePublished)
      node.datePublished = resolvableDateToIso(node.datePublished)
    if (node.uploadDate)
      node.uploadDate = resolvableDateToIso(node.uploadDate)

    return node
  },
})
