import type { NodeRelation, Thing } from '../../types'
import type { Organization } from '../Organization'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { organizationResolver } from '../Organization'

interface EmployerAggregateRatingBase extends Thing {
  '@type'?: 'EmployerAggregateRating'
  'itemReviewed': NodeRelation<Organization>
  'ratingValue': number | string
  'bestRating'?: number
  'worstRating'?: number
}

type EmployerRatingCount
  = | {
    ratingCount: number
    reviewCount?: number
  }
  | {
    ratingCount?: number
    reviewCount: number
  }

export type EmployerAggregateRatingSimple = EmployerAggregateRatingBase & EmployerRatingCount
export type EmployerAggregateRating = EmployerAggregateRatingSimple

export const employerAggregateRatingResolver = defineSchemaOrgResolver<EmployerAggregateRating>({
  defaults: {
    '@type': 'EmployerAggregateRating',
  },
  idPrefix: ['url', '#employer-aggregate-rating'],
  resolve(node, ctx) {
    node.itemReviewed = resolveRelation(node.itemReviewed, ctx, organizationResolver, {
      root: true,
    })
    return node
  },
})
