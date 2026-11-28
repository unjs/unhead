import type { Arrayable, Id, Identity, InteractionCounter, NodeRelation, NodeRelations, ResolvableDate, Thing } from '../../types'
import type { ImageObject } from '../Image'
import { defineSchemaOrgResolver, resolveIdentityRelation, resolveRelation } from '../../core'
import { interactionCounterResolver } from '../../core/common'
import {
  asArray,
  resolvableDateToIso,
  resolveWithBase,
  setIfEmpty,
} from '../../utils'
import { imageResolver, isImageObject } from '../Image'
import { organizationResolver } from '../Organization'
import { personResolver } from '../Person'

export interface Clip extends Thing {
  '@type'?: 'Clip'
  'name': string
  'startOffset': number
  'url': string
  'endOffset'?: number
}

export interface BroadcastEvent extends Thing {
  '@type'?: 'BroadcastEvent'
  'isLiveBroadcast': boolean
  'startDate': ResolvableDate
  'endDate'?: ResolvableDate
}

export interface SeekToAction extends Thing {
  '@type'?: 'SeekToAction'
  'target': string
  'startOffset-input': 'required name=seek_to_second_number'
}

export interface VideoSimple extends Thing {
  /**
   * The title of the video.
   */
  name?: string
  /**
   * A description of the video. Falls back to the caption.
   */
  description?: string
  /**
   * The person or organization that created the video.
   */
  creator?: NodeRelations<Identity>
  /**
   * The author of the video. Google accepts it in place of `creator`.
   */
  author?: NodeRelations<Identity>
  /**
   * A reference-by-ID to an imageObject.
   */
  thumbnail?: Arrayable<NodeRelation<ImageObject>>
  /**
   * A URL pointing to the video thumbnail image file. Follow the [thumbnail image guidelines](https://developers.google.com/search/docs/appearance/video#provide-a-high-quality-thumbnail).
   */
  thumbnailUrl?: Arrayable<string>
  /**
   * The date the video was published, in ISO 8601 format (e.g., 2020-01-20).
   */
  uploadDate?: ResolvableDate
  /**
   * Whether the video should be considered 'family friendly'
   */
  isFamilyFriendly?: boolean
  /**
   * The URL of the image file (e.g., /images/cat.jpg).
   */
  url?: string
  /**
   * The fully-qualified, absolute URL of the image file (e.g., https://www.example.com/images/cat.jpg).
   * Note: The contentUrl and url properties are intentionally duplicated.
   */
  contentUrl?: string
  /**
   * A text string describing the image.
   * - Fall back to the image alt attribute if no specific caption field exists or is defined.
   */
  caption?: string
  /**
   * The height of the image in pixels.
   * - Must be used with width.
   */
  height?: number
  /**
   * The width of the image in pixels.
   * - Must be used with height.
   */
  width?: number
  /**
   * The language code for the textual content; e.g., en-GB.
   * - Only needed when providing a caption.
   */
  inLanguage?: string
  /**
   * The duration of the video in ISO 8601 format.
   */
  duration?: string
  /**
   * A URL pointing to a player for the video.
   */
  embedUrl?: string
  /**
   * The encoding format of the video.
   */
  encodingFormat?: string
  /**
   * A transcript of the video.
   */
  transcript?: string
  /**
   * The date after which the video is no longer available.
   */
  expires?: ResolvableDate
  /**
   * Regions where the video is unavailable.
   */
  ineligibleRegion?: Arrayable<string>
  /**
   * Regions where the video is available.
   */
  regionsAllowed?: Arrayable<string>
  /**
   * The number of times the video has been watched.
   */
  interactionStatistic?: NodeRelations<InteractionCounter>
  /**
   * Key moments in the video.
   */
  hasPart?: NodeRelations<Clip>
  /**
   * Livestream publication details.
   */
  publication?: NodeRelations<BroadcastEvent>
  /**
   * URL pattern used to seek to a timestamp.
   */
  potentialAction?: NodeRelation<SeekToAction>
}

export interface VideoObject extends VideoSimple {}

const clipResolver = defineSchemaOrgResolver<Clip>({
  defaults: {
    '@type': 'Clip',
  },
  resolve(node, ctx) {
    node.url = resolveWithBase(ctx.meta.host, node.url)
    return node
  },
})

const broadcastEventResolver = defineSchemaOrgResolver<BroadcastEvent>({
  defaults: {
    '@type': 'BroadcastEvent',
  },
  resolve(node) {
    node.startDate = resolvableDateToIso(node.startDate)!
    node.endDate = resolvableDateToIso(node.endDate)
    return node
  },
})

const seekToActionResolver = defineSchemaOrgResolver<SeekToAction>({
  defaults: {
    '@type': 'SeekToAction',
  },
  resolve(node, ctx) {
    node.target = resolveWithBase(ctx.meta.host, node.target)
    return node
  },
})

/**
 * Describes an individual video (usually in the context of an embedded media object).
 */
export const videoResolver = defineSchemaOrgResolver<VideoObject, VideoObject | string>({
  cast(input) {
    if (typeof input === 'string') {
      input = {
        url: input,
      }
    }
    return input
  },
  alias: 'video',
  defaults: {
    '@type': 'VideoObject',
  },
  idPrefix: 'host',
  resolve(video, ctx) {
    if (video.uploadDate)
      video.uploadDate = resolvableDateToIso(video.uploadDate)
    video.expires = resolvableDateToIso(video.expires)
    if (video.url)
      video.url = resolveWithBase(ctx.meta.host, video.url)
    if (video.contentUrl)
      video.contentUrl = resolveWithBase(ctx.meta.host, video.contentUrl)
    if (video.embedUrl)
      video.embedUrl = resolveWithBase(ctx.meta.host, video.embedUrl)
    if (video.caption && !video.description)
      video.description = video.caption

    const identityResolvers = {
      organization: organizationResolver,
      person: personResolver,
    }
    video.creator = resolveIdentityRelation(video.creator, ctx, identityResolvers, { root: true })
    video.author = resolveIdentityRelation(video.author, ctx, identityResolvers, { root: true })

    if (video.thumbnailUrl && (typeof video.thumbnailUrl === 'string' || Array.isArray(video.thumbnailUrl))) {
      const images = asArray(video.thumbnailUrl).map(image => resolveWithBase(ctx.meta.host, image))
      video.thumbnailUrl = images.length > 1 ? images : images[0]
    }

    if (video.thumbnail)
      video.thumbnail = resolveRelation(video.thumbnail, ctx, imageResolver)
    video.hasPart = resolveRelation(video.hasPart, ctx, clipResolver)
    video.interactionStatistic = resolveRelation(video.interactionStatistic, ctx, interactionCounterResolver)
    video.potentialAction = resolveRelation(video.potentialAction, ctx, seekToActionResolver)
    video.publication = resolveRelation(video.publication, ctx, broadcastEventResolver)

    return video
  },
  // Page metadata describes the page. Only a video registered at the root of the graph
  // inherits it; a nested video, such as a Movie trailer, keeps only the values given.
  resolveRootNode(video, ctx) {
    const { find, meta } = ctx
    setIfEmpty(video, 'name', meta.title || undefined)
    setIfEmpty(video, 'description', meta.description || undefined)
    setIfEmpty(video, 'inLanguage', meta.inLanguage || undefined)
    setIfEmpty(video, 'uploadDate', resolvableDateToIso(meta.datePublished) || undefined)
    if (video.image === undefined && meta.image)
      video.image = resolveRelation(meta.image, ctx, imageResolver, { root: true })

    if (video.image && !video.thumbnailUrl) {
      const firstImage = asArray(video.image)[0]
      if (typeof firstImage === 'string')
        setIfEmpty(video, 'thumbnailUrl', resolveWithBase(meta.host, firstImage))
      else if (firstImage?.['@id'])
        setIfEmpty(video, 'thumbnailUrl', find(firstImage['@id'] as Id, isImageObject)?.url)
    }
  },
})
