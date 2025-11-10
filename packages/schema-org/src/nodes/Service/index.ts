import type { Arrayable, NodeRelation, NodeRelations, Thing } from '../../types'
import type { AggregateOffer } from '../AggregateOffer'
import type { AggregateRating } from '../AggregateRating'
import type { ImageObject } from '../Image'
import type { Offer } from '../Offer'
import type { Organization } from '../Organization'
import type { Person } from '../Person'
import type { Review } from '../Review'
import type { WebPage } from '../WebPage'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import {
  IdentityId,
  idReference,
  resolveDefaultType,
  setIfEmpty,
} from '../../utils'
import { aggregateOfferResolver } from '../AggregateOffer'
import { aggregateRatingResolver } from '../AggregateRating'
import { offerResolver } from '../Offer'
import { reviewResolver } from '../Review'
import { PrimaryWebPageId } from '../WebPage'

type ValidServiceSubTypes =
  | 'Service'
  | 'BroadcastService'
  | 'CableOrSatelliteService'
  | 'FinancialService'
  | 'FoodService'
  | 'GovernmentService'
  | 'TaxiService'
  | 'Telecom'

/**
 * ServiceChannel defines how a service can be accessed.
 */
export interface ServiceChannel {
  /**
   * The type should be ServiceChannel.
   */
  '@type'?: 'ServiceChannel'
  /**
   * The URL where the service is available.
   */
  serviceUrl?: string
  /**
   * The phone number to access the service.
   */
  servicePhone?: string
  /**
   * The physical location where the service is available.
   */
  serviceLocation?: string
  /**
   * The languages supported by the service.
   */
  availableLanguage?: string | string[]
}

/**
 * A service provided by an organization, e.g. delivery service, print services, etc.
 */
export interface ServiceSimple extends Thing {
  /**
   * The type of the service. Can be 'Service' or a more specific subtype.
   */
  '@type'?: Arrayable<ValidServiceSubTypes>
  /**
   * The name of the service.
   */
  name: string
  /**
   * A description of the service.
   */
  description?: string
  /**
   * The type of service being offered, e.g. veterans' benefits, emergency relief, etc.
   */
  serviceType?: string
  /**
   * A reference to the Person or Organization that provides the service.
   */
  provider?: NodeRelation<Person | Organization>
  /**
   * The geographic area where the service is provided.
   * Can be a text description or a Place object.
   */
  areaServed?: string | unknown
  /**
   * A means of accessing the service (e.g. a phone bank, a web site, a location, etc.).
   */
  availableChannel?: ServiceChannel | ServiceChannel[]
  /**
   * An intended audience, i.e. a group for whom the service was created.
   */
  audience?: unknown
  /**
   * A category for the item. Greater signs or slashes can be used to informally indicate a category hierarchy.
   */
  category?: string | string[]
  /**
   * Indicates an OfferCatalog listing for this Service.
   */
  hasOfferCatalog?: unknown
  /**
   * An offer to provide this service—for example, an offer to perform a service for a price, or without charge.
   * Can be a single Offer, AggregateOffer, or an array of offers.
   */
  offers?: NodeRelations<Offer | AggregateOffer>
  /**
   * The overall rating, based on a collection of reviews or ratings, of the service.
   */
  aggregateRating?: NodeRelation<AggregateRating>
  /**
   * A review of the service.
   */
  review?: NodeRelations<Review>
  /**
   * An image of the service.
   * - Must be at least 696 pixels wide.
   * - Must be of the following formats+file extensions: .jpg, .png, .gif, or .webp.
   */
  image?: NodeRelations<ImageObject | string>
  /**
   * A logo associated with the service.
   */
  logo?: NodeRelations<ImageObject | string>
  /**
   * URL of the service.
   */
  url?: string
  /**
   * Human-readable terms of service documentation.
   */
  termsOfService?: string
  /**
   * A slogan or motto associated with the service.
   */
  slogan?: string
  /**
   * The brand associated with the service.
   */
  brand?: NodeRelation<Organization>
}

export interface Service extends ServiceSimple {}

export const ServiceId = '#service'

/**
 * Describes a service provided by an organization or person.
 */
export const serviceResolver = defineSchemaOrgResolver<Service>({
  defaults: {
    '@type': 'Service',
  },
  inheritMeta: [
    'description',
    'image',
    { meta: 'title', key: 'name' },
  ],
  idPrefix: ['url', ServiceId],
  resolve(node, ctx) {
    resolveDefaultType(node, 'Service')

    // Resolve related nodes
    node.offers = resolveRelation(node.offers, ctx, offerResolver)
    node.aggregateRating = resolveRelation(node.aggregateRating, ctx, aggregateRatingResolver)
    node.review = resolveRelation(node.review, ctx, reviewResolver)

    // If offers includes AggregateOffer, resolve it
    if (node.offers) {
      node.offers = resolveRelation(node.offers, ctx, aggregateOfferResolver)
    }

    return node
  },
  resolveRootNode(service, { find }) {
    const webPage = find<WebPage>(PrimaryWebPageId)
    const identity = find<Person | Organization>(IdentityId)

    // Set the provider to the identity if not specified
    if (identity)
      setIfEmpty(service, 'provider', idReference(identity))

    // Set the brand to the identity if not specified
    if (identity)
      setIfEmpty(service, 'brand', idReference(identity))

    // Link to the main web page
    if (webPage)
      setIfEmpty(service, 'mainEntityOfPage', idReference(webPage))

    return service
  },
})
