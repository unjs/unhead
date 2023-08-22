import type { Identity, NodeRelation, Thing } from '../../types'
import {
  IdentityId,
  idReference, setIfEmpty,
} from '../../utils'
import type { Organization } from '../Organization'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { organizationResolver } from '../Organization'

/**
 * Any offered product or service.
 * For example: a pair of shoes; a concert ticket; the rental of a car;
 * a haircut; or an episode of a TV show streamed online.
 */
export interface CourseSimple extends Thing {
  /**
   * The title of the course.
   */
  name: string
  /**
   * A description of the course. Display limit of 60 characters.
   */
  description?: string
  /**
   *  A reference to an Organization piece, representing brand associated with the Product.
   */
  provider?: NodeRelation<Organization>
}

export interface Course extends CourseSimple {}

export const courseResolver = defineSchemaOrgResolver<Course>({
  defaults: {
    '@type': 'Course',
  },
  resolve(node, ctx) {
    // provide a default sku
    node.provider = resolveRelation(node.provider, ctx, organizationResolver, {
      root: true,
    })
    return node
  },
  resolveRootNode(node, { find }) {
    const identity = find<Identity>(IdentityId)

    if (identity)
      setIfEmpty(node, 'provider', idReference(identity))

    return node
  },
})
