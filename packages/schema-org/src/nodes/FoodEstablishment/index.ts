import type { NodeRelations } from '../../types'
import type { LocalBusiness } from '../LocalBusiness'
import type { Rating } from '../Rating'
import { defineSchemaOrgResolver, resolveNode, resolveRelation } from '../../core'
import {
  IdentityId,
  resolveDefaultType,
} from '../../utils'
import { localBusinessResolver } from '../LocalBusiness'
import { ratingResolver } from '../Rating'

type ValidFoodEstablishmentSubTypes = 'Bakery' |
  'BarOrPub' |
  'Brewery' |
  'Dentist' |
  'CafeOrCoffeeShop' |
  'Distillery' |
  'FastFoodRestaurant' |
  'IceCreamShop' |
  'Restaurant' |
  'Winery'

export interface FoodEstablishmentSimple extends Omit<LocalBusiness, '@type'> {
  '@type'?: ['Organization', 'LocalBusiness', 'FoodEstablishment'] | ['Organization', 'LocalBusiness', 'FoodEstablishment', ValidFoodEstablishmentSubTypes] | ValidFoodEstablishmentSubTypes
  /**
   * Indicates whether a FoodEstablishment accepts reservations.
   */
  'acceptsReservations'?: string | boolean
  /**
   * URL of the menu.
   */
  'hasMenu'?: string
  /**
   * The cuisine of the restaurant.
   */
  'servesCuisine'?: string
  /**
   * An official rating for a lodging business or food establishment
   */
  'starRating'?: NodeRelations<Rating>
}

export interface FoodEstablishment extends FoodEstablishmentSimple {}

/**
 * Describes a business which allows public visitation.
 * Typically, used to represent the business 'behind' the website, or on a page about a specific business.
 */
export const foodEstablishmentResolver = defineSchemaOrgResolver<FoodEstablishment>({
  defaults: {
    '@type': ['Organization', 'LocalBusiness', 'FoodEstablishment'],
  },
  inheritMeta: [
    { key: 'url', meta: 'host' },
    { key: 'currenciesAccepted', meta: 'currency' },
  ],
  idPrefix: ['host', IdentityId],
  resolve(node, ctx) {
    resolveDefaultType(node, ['Organization', 'LocalBusiness', 'FoodEstablishment'])

    node.starRating = resolveRelation(node.starRating, ctx, ratingResolver)
    node = resolveNode(node as LocalBusiness, ctx, localBusinessResolver) as FoodEstablishment
    return node
  },
  resolveRootNode(node, ctx) {
    localBusinessResolver.resolveRootNode!(node as LocalBusiness, ctx)
    return node
  },
})
