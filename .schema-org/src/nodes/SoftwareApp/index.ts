import type { Arrayable, NodeRelation, NodeRelations, Thing } from '../../types'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import type { Offer } from '../Offer'
import { offerResolver } from '../Offer'
import type { AggregateRating } from '../AggregateRating'
import { aggregateRatingResolver } from '../AggregateRating'
import type { Review } from '../Review'
import { reviewResolver } from '../Review'
import { resolveDefaultType } from '../../utils'

type ApplicationCategory =
'GameApplication' |
'SocialNetworkingApplication' |
'TravelApplication' |
'ShoppingApplication' |
'SportsApplication' |
'LifestyleApplication' |
'BusinessApplication' |
'DesignApplication' |
'DeveloperApplication' |
'DriverApplication' |
'EducationalApplication' |
'HealthApplication' |
'FinanceApplication' |
'SecurityApplication' |
'BrowserApplication' |
'CommunicationApplication' |
'DesktopEnhancementApplication' |
'EntertainmentApplication' |
'MultimediaApplication' |
'HomeApplication' |
'UtilitiesApplication' |
'ReferenceApplication'

export interface SoftwareAppSimple extends Thing {
  '@type'?: Arrayable<'SoftwareApplication' | 'MobileApplication' | 'VideoGame' | 'WebApplication'>
  /**
   * The name of the app.
   */
  name?: string
  /**
   * An offer to sell the app.
   * For developers, offers can indicate the marketplaces that carry the application.
   * For marketplaces, use offers to indicate the price of the app for a specific app instance.
   */
  offers: NodeRelations<Offer>
  /**
   * The average review score of the app.
   */
  aggregateRating?: NodeRelation<AggregateRating>
  /**
   * A single review of the app.
   */
  review?: NodeRelation<Review>
  /**
   * The type of app (for example, BusinessApplication or GameApplication). The value must be a supported app type.
   */
  applicationCategory?: ApplicationCategory
  /**
   * The operating system(s) required to use the app (for example, Windows 7, OSX 10.6, Android 1.6)
   */
  operatingSystem?: string
}

export interface SoftwareApp extends SoftwareAppSimple {}

export const softwareAppResolver = defineSchemaOrgResolver<SoftwareApp>({
  defaults: {
    '@type': 'SoftwareApplication',
  },
  resolve(node, ctx) {
    resolveDefaultType(node, 'SoftwareApplication')
    node.offers = resolveRelation(node.offers, ctx, offerResolver)
    node.aggregateRating = resolveRelation(node.aggregateRating, ctx, aggregateRatingResolver)
    node.review = resolveRelation(node.review, ctx, reviewResolver)
    return node
  },
})
