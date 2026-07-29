import type { Arrayable, NodeRelation, NodeRelations, OptionalSchemaOrgPrefix, Thing } from '../../types'
import type { AggregateOffer } from '../AggregateOffer'
import type { AggregateRating } from '../AggregateRating'
import type { ImageObject } from '../Image'
import type { QuantitativeValue } from '../MonetaryAmount'
import type { Offer } from '../Offer'
import type { Organization } from '../Organization'
import type { Rating } from '../Rating'
import type { Review } from '../Review'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import {
  IdentityId,
  idReference,
  resolveWithBase,
  setIfEmpty,
  withBase,
} from '../../utils'
import { aggregateOfferResolver } from '../AggregateOffer'
import { aggregateRatingResolver } from '../AggregateRating'
import { quantitativeValueResolver } from '../MonetaryAmount'
import { offerResolver } from '../Offer'
import { organizationResolver } from '../Organization'
import { reviewResolver } from '../Review'
import { PrimaryWebPageId } from '../WebPage'

export interface Brand extends Thing {
  '@type'?: 'Brand'
  'name': string
}

export interface PeopleAudience extends Thing {
  '@type'?: 'PeopleAudience'
  'audienceType'?: string
  'suggestedAge'?: NodeRelation<QuantitativeValue>
  'suggestedMaxAge'?: number
  'suggestedMinAge'?: number
  'suggestedGender'?: OptionalSchemaOrgPrefix<'Female' | 'Male'> | 'Unisex' | 'female' | 'male' | 'unisex'
}

export interface Certification extends Thing {
  '@type'?: 'Certification'
  'certificationIdentification'?: string
  'certificationRating'?: NodeRelation<Rating>
  'issuedBy': NodeRelation<Organization>
  'name': 'EPREL' | 'Vehicle_CO2_Class' | 'Vehicle_CO2_Class_Discharged_Battery'
  'url'?: string
}

export interface CategoryCode extends Thing {
  '@type'?: 'CategoryCode'
  'codeValue': string
  'inCodeSet': string
}

type WearableSizeGroup = OptionalSchemaOrgPrefix<
  'WearableSizeGroupBig'
  | 'WearableSizeGroupMaternity'
  | 'WearableSizeGroupPetite'
  | 'WearableSizeGroupPlus'
  | 'WearableSizeGroupRegular'
  | 'WearableSizeGroupTall'
>

type WearableSizeSystem = OptionalSchemaOrgPrefix<
  'WearableSizeSystemAU'
  | 'WearableSizeSystemBR'
  | 'WearableSizeSystemCN'
  | 'WearableSizeSystemDE'
  | 'WearableSizeSystemEurope'
  | 'WearableSizeSystemFR'
  | 'WearableSizeSystemIT'
  | 'WearableSizeSystemJP'
  | 'WearableSizeSystemMX'
  | 'WearableSizeSystemUK'
  | 'WearableSizeSystemUS'
>

export interface SizeSpecification extends Thing {
  '@type'?: 'SizeSpecification'
  'name'?: string
  'sizeGroup'?: Arrayable<WearableSizeGroup | string>
  'sizeSystem'?: WearableSizeSystem | string
}

export interface ProductGroup extends Thing {
  '@type'?: 'ProductGroup'
  'name': string
  'aggregateRating'?: NodeRelation<AggregateRating>
  'audience'?: NodeRelations<PeopleAudience>
  'brand'?: NodeRelation<Brand>
  'description'?: string
  'hasAdultConsideration'?: Arrayable<AdultConsideration>
  'hasVariant'?: NodeRelations<Product | ProductVariantReference>
  'material'?: Arrayable<string | Thing>
  'pattern'?: Arrayable<string>
  'productGroupID'?: string
  'review'?: NodeRelations<Review>
  'url'?: string
  'variesBy'?: Arrayable<OptionalSchemaOrgPrefix<'color' | 'material' | 'pattern' | 'size' | 'suggestedAge' | 'suggestedGender'>>
}

export interface ProductVariantReference extends Thing {
  '@type'?: 'Product'
  'url': string
}

export interface MediaObject extends Thing {
  '@type'?: 'MediaObject'
  'contentUrl': string
  'encodingFormat'?: string
}

export interface ThreeDModel extends Thing {
  '@type'?: '3DModel'
  'encoding': NodeRelations<MediaObject>
  'name'?: string
}

type AdultConsideration = OptionalSchemaOrgPrefix<'SexualContentConsideration'>

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
  brand?: NodeRelation<Brand | Organization>
  /**
   * A reference to an Organization piece which represents the seller/merchant.
   */
  seller?: NodeRelation<Organization>
  /**
   * A text description of the product.
   */
  description?: string
  /**
   * The product or variant URL.
   */
  url?: string
  /**
   * An array of references-by-id to one or more Review pieces.
   */
  review?: NodeRelations<Review>
  /**
   * A merchant-specific identifier for the Product.
   */
  sku?: string
  /**
   * The Global Trade Item Number (GTIN) of the product.
   */
  gtin?: string
  /**
   * The Manufacturer Part Number (MPN) of the product.
   */
  mpn?: string
  /**
   * The condition of the product (e.g., New, Used, Refurbished).
   */
  itemCondition?: string
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
  audience?: NodeRelations<PeopleAudience>
  category?: Arrayable<NodeRelation<CategoryCode> | string>
  color?: Arrayable<string>
  gtin8?: string
  gtin12?: string
  gtin13?: string
  gtin14?: string
  isbn?: string
  hasAdultConsideration?: Arrayable<AdultConsideration>
  hasCertification?: NodeRelations<Certification>
  inProductGroupWithID?: string
  isVariantOf?: NodeRelation<ProductGroup>
  material?: Arrayable<string | Thing>
  pattern?: Arrayable<string>
  size?: NodeRelation<SizeSpecification | string>
  subjectOf?: NodeRelation<ThreeDModel>
}

export interface Product extends ProductSimple {}

export const ProductId = '#product'

export const brandResolver = defineSchemaOrgResolver<Brand>({
  defaults: {
    '@type': 'Brand',
  },
})

const peopleAudienceResolver = defineSchemaOrgResolver<PeopleAudience>({
  defaults: {
    '@type': 'PeopleAudience',
  },
  resolve(node, ctx) {
    node.suggestedAge = resolveRelation(node.suggestedAge, ctx, quantitativeValueResolver)
    return node
  },
})

const certificationRatingResolver = defineSchemaOrgResolver<Rating>({
  // Certification scales are domain-specific, so do not apply Rating's 1 to 5 defaults.
  defaults: {
    '@type': 'Rating',
  },
})

const certificationResolver = defineSchemaOrgResolver<Certification>({
  defaults: {
    '@type': 'Certification',
  },
  resolve(node, ctx) {
    node.certificationRating = resolveRelation(node.certificationRating, ctx, certificationRatingResolver)
    node.issuedBy = resolveRelation(node.issuedBy, ctx, organizationResolver)
    if (node.url)
      node.url = resolveWithBase(ctx.meta.host, node.url)
    return node
  },
})

const categoryCodeResolver = defineSchemaOrgResolver<CategoryCode>({
  defaults: {
    '@type': 'CategoryCode',
  },
  resolve(node, ctx) {
    node.inCodeSet = resolveWithBase(ctx.meta.host, node.inCodeSet)
    return node
  },
})

const sizeSpecificationResolver = defineSchemaOrgResolver<SizeSpecification>({
  defaults: {
    '@type': 'SizeSpecification',
  },
})

const productVariantReferenceResolver = defineSchemaOrgResolver<ProductVariantReference>({
  defaults: {
    '@type': 'Product',
  },
  resolve(node, ctx) {
    node.url = resolveWithBase(ctx.meta.host, node.url)
    return node
  },
})

const productGroupResolver = defineSchemaOrgResolver<ProductGroup>({
  defaults: {
    '@type': 'ProductGroup',
  },
  resolve(node, ctx) {
    node.aggregateRating = resolveRelation(node.aggregateRating, ctx, aggregateRatingResolver)
    node.audience = resolveRelation(node.audience, ctx, peopleAudienceResolver)
    node.brand = resolveRelation(node.brand, ctx, brandResolver)
    if (node.hasVariant) {
      const resolveVariant = (variant: NodeRelation<Product | ProductVariantReference>) => {
        const isReference = typeof variant === 'object'
          && variant !== null
          && 'url' in variant
          && !('name' in variant)
          && !('image' in variant)
        return isReference
          ? resolveRelation(variant as ProductVariantReference, ctx, productVariantReferenceResolver)
          // ProductGroup and Product may nest each other. Resolution happens
          // after module initialization, when both definitions are available.
          // eslint-disable-next-line ts/no-use-before-define
          : resolveRelation(variant as Product, ctx, productResolver)
      }
      node.hasVariant = Array.isArray(node.hasVariant)
        ? node.hasVariant.map(resolveVariant)
        : resolveVariant(node.hasVariant)
    }
    node.review = resolveRelation(node.review, ctx, reviewResolver)
    if (node.url)
      node.url = resolveWithBase(ctx.meta.host, node.url)
    if (node.variesBy) {
      node.variesBy = (Array.isArray(node.variesBy)
        ? node.variesBy.map(property => withBase(property, 'https://schema.org/'))
        : withBase(node.variesBy, 'https://schema.org/')) as ProductGroup['variesBy']
    }
    return node
  },
})

const mediaObjectResolver = defineSchemaOrgResolver<MediaObject>({
  defaults: {
    '@type': 'MediaObject',
  },
  resolve(node, ctx) {
    node.contentUrl = resolveWithBase(ctx.meta.host, node.contentUrl)
    return node
  },
})

const threeDModelResolver = defineSchemaOrgResolver<ThreeDModel>({
  defaults: {
    '@type': '3DModel',
  },
  resolve(node, ctx) {
    node.encoding = resolveRelation(node.encoding, ctx, mediaObjectResolver)
    return node
  },
})

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
    node.aggregateOffer = resolveRelation(node.aggregateOffer, ctx, aggregateOfferResolver)
    node.aggregateRating = resolveRelation(node.aggregateRating, ctx, aggregateRatingResolver)
    node.audience = resolveRelation(node.audience, ctx, peopleAudienceResolver)
    if (node.category) {
      const values = Array.isArray(node.category) ? node.category : [node.category]
      const resolved = values.map(category => typeof category === 'string'
        ? category
        : resolveRelation(category, ctx, categoryCodeResolver))
      node.category = Array.isArray(node.category) ? resolved : resolved[0]
    }
    if (node.brand) {
      const isBrand = typeof node.brand === 'object' && node.brand?.['@type'] === 'Brand'
      node.brand = isBrand
        ? resolveRelation(node.brand as NodeRelation<Brand>, ctx, brandResolver)
        : resolveRelation(node.brand as NodeRelation<Organization>, ctx, organizationResolver)
    }
    node.hasCertification = resolveRelation(node.hasCertification, ctx, certificationResolver)
    node.isVariantOf = resolveRelation(node.isVariantOf, ctx, productGroupResolver)
    node.manufacturer = resolveRelation(node.manufacturer, ctx, organizationResolver)
    node.offers = resolveRelation(node.offers, ctx, offerResolver)
    node.review = resolveRelation(node.review, ctx, reviewResolver)
    node.seller = resolveRelation(node.seller, ctx, organizationResolver)
    node.size = typeof node.size === 'string'
      ? node.size
      : resolveRelation(node.size, ctx, sizeSpecificationResolver)
    node.subjectOf = resolveRelation(node.subjectOf, ctx, threeDModelResolver)
    if (node.url)
      node.url = resolveWithBase(ctx.meta.host, node.url)
    return node
  },
  resolveRootNode(product, { find }) {
    const webPage = find(PrimaryWebPageId)
    const identity = find(IdentityId)

    if (identity)
      setIfEmpty(product, 'brand', idReference(identity))

    if (webPage)
      setIfEmpty(product, 'mainEntityOfPage', idReference(webPage))

    return product
  },
})
