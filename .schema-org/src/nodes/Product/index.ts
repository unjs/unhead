import { hash } from 'ohash'
import type { NodeRelation, NodeRelations, Thing } from '../../types'
import {
  IdentityId,
  idReference, setIfEmpty,
} from '../../utils'
import type { WebPage } from '../WebPage'
import { PrimaryWebPageId } from '../WebPage'
import type { Person } from '../Person'
import type { Organization } from '../Organization'
import type { Review } from '../Review'
import { reviewResolver } from '../Review'
import type { AggregateRating } from '../AggregateRating'
import { aggregateRatingResolver } from '../AggregateRating'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import type { AggregateOffer } from '../AggregateOffer'
import { aggregateOfferResolver } from '../AggregateOffer'
import type { Offer } from '../Offer'
import { offerResolver } from '../Offer'
import type { ImageObject } from '../Image'

/**
 * Any offered product or service.
 * For example: a pair of shoes; a concert ticket; the rental of a car;
 * a haircut; or an episode of a TV show streamed online.
 */
export interface ProductSimple extends Thing {
  /**
   * The name of the product.
   */
  name: string
  /**
   * A reference-by-ID to one or more imageObject's which represent the product.
   * - Must be at least 696 pixels wide.
   * - Must be of the following formats+file extensions: .jpg, .png, .gif ,or .webp.
   */
  image: NodeRelations<ImageObject | string>
  /**
   *  An array of references-by-ID to one or more Offer or aggregateOffer pieces.
   */
  offers?: NodeRelations<Offer | number>
  /**
   *  A reference to an Organization piece, representing brand associated with the Product.
   */
  brand?: NodeRelation<Organization>
  /**
   * A reference to an Organization piece which represents the WebSite.
   */
  seller?: NodeRelation<Organization>
  /**
   * A text description of the product.
   */
  description?: string
  /**
   * An array of references-by-id to one or more Review pieces.
   */
  review?: NodeRelations<Review>
  /**
   * A merchant-specific identifier for the Product.
   */
  sku?: string
  /**
   * An AggregateRating object.
   */
  aggregateRating?: NodeRelation<AggregateRating>
  /**
   * An AggregateOffer object.
   */
  aggregateOffer?: NodeRelation<AggregateOffer>
  /**
   * A reference to an Organization piece, representing the brand which produces the Product.
   */
  manufacturer?: NodeRelation<Organization>
}

export interface Product extends ProductSimple {}

export const ProductId = '#product'

export const productResolver = defineSchemaOrgResolver<Product>({
  defaults: {
    '@type': 'Product',
  },
  inheritMeta: [
    'description',
    'image',
    { meta: 'title', key: 'name' },
  ],
  idPrefix: ['url', ProductId],
  resolve(node, ctx) {
    // provide a default sku
    setIfEmpty(node, 'sku', hash(node.name))
    node.aggregateOffer = resolveRelation(node.aggregateOffer, ctx, aggregateOfferResolver)
    node.aggregateRating = resolveRelation(node.aggregateRating, ctx, aggregateRatingResolver)
    node.offers = resolveRelation(node.offers, ctx, offerResolver)
    node.review = resolveRelation(node.review, ctx, reviewResolver)
    return node
  },
  resolveRootNode(product, { find }) {
    const webPage = find<WebPage>(PrimaryWebPageId)
    const identity = find<Person | Organization>(IdentityId)

    if (identity)
      setIfEmpty(product, 'brand', idReference(identity))

    if (webPage)
      setIfEmpty(product, 'mainEntityOfPage', idReference(webPage))

    return product
  },
})
