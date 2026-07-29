import type { Identity, NodeRelations, SchemaOrgNode, Thing } from '../../types'
import { defineSchemaOrgResolver, resolveIdentityRelation } from '../../core'
import {
  resolveWithBase,
  setIfEmpty,
} from '../../utils'
import { organizationResolver } from '../Organization'
import { personResolver } from '../Person'

interface ImageBase extends Thing {
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
   * The name of the image.
   */
  name?: string
  /**
   * A description of the image.
   */
  description?: string
  /**
   * The file format or media type of the image (e.g., image/jpeg).
   */
  encodingFormat?: string
  /**
   * The creator of the image.
   */
  creator?: NodeRelations<Identity>
  /**
   * Credit text displayed with the image.
   */
  creditText?: string
  /**
   * A copyright notice for the image.
   */
  copyrightNotice?: string
  /**
   * A URL describing the image license.
   */
  license?: string
  /**
   * A URL where users can acquire a license.
   */
  acquireLicensePage?: string
}

type ImageLocation
  = | {
    url: string
    contentUrl?: string
  }
  | {
    url?: string
    contentUrl: string
  }

export type ImageSimple = ImageBase & ImageLocation
export type ImageObject = ImageSimple

/** Narrow an arbitrary graph node to an image with its required URL. */
export function isImageObject(node: SchemaOrgNode): node is ImageObject {
  return typeof node.url === 'string' || typeof node.contentUrl === 'string'
}

/**
 * Describes an individual image (usually in the context of an embedded media object).
 */
export const imageResolver = defineSchemaOrgResolver<ImageObject, ImageObject | string>({
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
  resolve(image, ctx) {
    const { meta } = ctx
    if (image.url)
      image.url = resolveWithBase(meta.host, image.url)
    if (image.contentUrl)
      image.contentUrl = resolveWithBase(meta.host, image.contentUrl)
    setIfEmpty(image, 'contentUrl', image.url)
    setIfEmpty(image, 'url', image.contentUrl)
    image.creator = resolveIdentityRelation(image.creator, ctx, {
      organization: organizationResolver,
      person: personResolver,
    }, {
      root: true,
    })
    if (image.license)
      image.license = resolveWithBase(meta.host, image.license)
    if (image.acquireLicensePage)
      image.acquireLicensePage = resolveWithBase(meta.host, image.acquireLicensePage)
    // image height and width are required to render
    if (image.height && !image.width)
      delete image.height
    if (image.width && !image.height)
      delete image.width
    return image
  },
})
