import type { Id, NodeRelation, ResolvableDate, Thing } from '../../types'
import {
  asArray,
  resolvableDateToIso,
  resolveWithBase, setIfEmpty,
} from '../../utils'
import type { ImageObject } from '../Image'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { imageResolver } from '../Image'

export interface VideoSimple extends Thing {
  /**
   * The title of the video.
   */
  name?: string
  /**
   * A description of the video (falling back to the caption, then to 'No description').
   */
  description?: string
  /**
   * A reference-by-ID to an imageObject.
   */
  thumbnailUrl?: NodeRelation<ImageObject>
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
  url: string
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
}

export interface VideoObject extends VideoSimple {}

/**
 * Describes an individual video (usually in the context of an embedded media object).
 */
export const videoResolver = defineSchemaOrgResolver<VideoObject>({
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
  inheritMeta: [
    { meta: 'title', key: 'name' },
    'description',
    'image',
    'inLanguage',
    { meta: 'datePublished', key: 'uploadDate' },
  ],
  idPrefix: 'host',
  resolve(video, ctx) {
    if (video.uploadDate)
      video.uploadDate = resolvableDateToIso(video.uploadDate)
    video.url = resolveWithBase(ctx.meta.host, video.url)
    if (video.caption && !video.description)
      video.description = video.caption

    if (!video.description)
      video.description = 'No description'

    if (video.thumbnailUrl)
      video.thumbnailUrl = resolveRelation(video.thumbnailUrl, ctx, imageResolver)

    return video
  },
  resolveRootNode(video, { find }) {
    if (video.image && !video.thumbnailUrl) {
      const firstImage = asArray(video.image)[0] as ImageObject
      setIfEmpty(video, 'thumbnailUrl', find<ImageObject>(firstImage['@id'] as Id)?.url)
    }
  },
})
