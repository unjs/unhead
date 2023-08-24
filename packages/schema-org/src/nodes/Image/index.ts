import type { Thing } from '../../types'
import {
  resolveWithBase, setIfEmpty,
} from '../../utils'
import { defineSchemaOrgResolver } from '../../core'

export interface ImageSimple extends Thing {
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
}

export interface ImageObject extends ImageSimple {}

/**
 * Describes an individual image (usually in the context of an embedded media object).
 */
export const imageResolver = defineSchemaOrgResolver<ImageObject>({
  alias: 'image',
  cast(input) {
    if (typeof input === 'string') {
      input = {
        url: input,
      }
    }
    return input
  },
  defaults: {
    '@type': 'ImageObject',
  },
  inheritMeta: [
    // @todo possibly only do if there's a caption
    'inLanguage',
  ],
  idPrefix: 'host',
  resolve(image, { meta }) {
    image.url = resolveWithBase(meta.host, image.url)
    setIfEmpty(image, 'contentUrl', image.url)
    // image height and width are required to render
    if (image.height && !image.width)
      delete image.height
    if (image.width && !image.height)
      delete image.width
    return image
  },
})
