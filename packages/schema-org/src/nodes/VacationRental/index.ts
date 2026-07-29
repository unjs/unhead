import type {
  Arrayable,
  GeoCoordinates,
  NodeRelation,
  NodeRelations,
  Thing,
} from '../../types'
import type { AggregateRating } from '../AggregateRating'
import type { QuantitativeValue } from '../MonetaryAmount'
import type { PostalAddress } from '../PostalAddress'
import type { Brand } from '../Product'
import type { Review } from '../Review'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { idReference, resolveWithBase, setIfEmpty } from '../../utils'
import { aggregateRatingResolver } from '../AggregateRating'
import { quantitativeValueResolver } from '../MonetaryAmount'
import { addressResolver } from '../PostalAddress'
import { brandResolver } from '../Product'
import { reviewResolver } from '../Review'
import { PrimaryWebPageId } from '../WebPage'

export interface LocationFeatureSpecification extends Thing {
  '@type'?: 'LocationFeatureSpecification'
  'name': string
  'value': boolean | number | string
}

export interface BedDetails extends Thing {
  '@type'?: 'BedDetails'
  'numberOfBeds': number
  'typeOfBed': 'CaliforniaKing' | 'King' | 'Queen' | 'Full' | 'Double' | 'SemiDouble' | 'Single' | (string & Record<never, never>)
}

export interface Accommodation extends Thing {
  '@type'?: 'Accommodation'
  'occupancy': NodeRelation<QuantitativeValue>
  'additionalType'?: 'EntirePlace' | 'PrivateRoom' | 'SharedRoom'
  'amenityFeature'?: NodeRelations<LocationFeatureSpecification>
  'bed'?: NodeRelations<BedDetails>
  'floorSize'?: NodeRelation<QuantitativeValue>
  'numberOfBathroomsTotal'?: number
  'numberOfBedrooms'?: number
  'numberOfRooms'?: number
  'petsAllowed'?: boolean
  'smokingAllowed'?: boolean
}

interface VacationRentalBase extends Thing {
  '@type'?: 'VacationRental'
  'containsPlace': NodeRelation<Accommodation>
  'identifier': string
  'image': Arrayable<string>
  'name': string
  'additionalType'?: string
  'address'?: NodeRelation<PostalAddress>
  'aggregateRating'?: NodeRelation<AggregateRating>
  'brand'?: NodeRelation<Brand>
  'checkinTime'?: string
  'checkoutTime'?: string
  'description'?: string
  'knowsLanguage'?: Arrayable<string>
  'review'?: NodeRelations<Review>
}

type VacationRentalLocation
  = | {
    geo: NodeRelation<GeoCoordinates>
    latitude?: number
    longitude?: number
  }
  | {
    geo?: NodeRelation<GeoCoordinates>
    latitude: number
    longitude: number
  }

export type VacationRentalSimple = VacationRentalBase & VacationRentalLocation
export type VacationRental = VacationRentalSimple

export const geoCoordinatesResolver = defineSchemaOrgResolver<GeoCoordinates>({
  defaults: {
    '@type': 'GeoCoordinates',
  },
})

const locationFeatureSpecificationResolver = defineSchemaOrgResolver<LocationFeatureSpecification>({
  defaults: {
    '@type': 'LocationFeatureSpecification',
  },
})

const bedDetailsResolver = defineSchemaOrgResolver<BedDetails>({
  defaults: {
    '@type': 'BedDetails',
  },
})

const accommodationResolver = defineSchemaOrgResolver<Accommodation>({
  defaults: {
    '@type': 'Accommodation',
  },
  resolve(node, ctx) {
    node.amenityFeature = resolveRelation(node.amenityFeature, ctx, locationFeatureSpecificationResolver)
    node.bed = resolveRelation(node.bed, ctx, bedDetailsResolver)
    node.floorSize = resolveRelation(node.floorSize, ctx, quantitativeValueResolver)
    node.occupancy = resolveRelation(node.occupancy, ctx, quantitativeValueResolver)
    return node
  },
})

export const vacationRentalResolver = defineSchemaOrgResolver<VacationRental>({
  defaults: {
    '@type': 'VacationRental',
  },
  inheritMeta: [
    'description',
    'image',
    { meta: 'title', key: 'name' },
  ],
  idPrefix: ['url', '#vacation-rental'],
  resolve(node, ctx) {
    node.address = resolveRelation(node.address, ctx, addressResolver)
    node.aggregateRating = resolveRelation(node.aggregateRating, ctx, aggregateRatingResolver)
    node.brand = resolveRelation(node.brand, ctx, brandResolver)
    node.containsPlace = resolveRelation(node.containsPlace, ctx, accommodationResolver)
    node.geo = resolveRelation(node.geo, ctx, geoCoordinatesResolver)
    node.review = resolveRelation(node.review, ctx, reviewResolver)
    node.image = (Array.isArray(node.image) ? node.image : [node.image])
      .map(image => resolveWithBase(ctx.meta.host, image))
    return node
  },
  resolveRootNode(node, { find }) {
    const webPage = find(PrimaryWebPageId)
    if (webPage)
      setIfEmpty(node, 'mainEntityOfPage', idReference(webPage))
  },
})
