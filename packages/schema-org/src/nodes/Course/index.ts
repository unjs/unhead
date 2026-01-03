import type { Identity, NodeRelation, Thing } from '../../types'
import type { Organization } from '../Organization'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import {
  IdentityId,
  idReference,
  setIfEmpty,
} from '../../utils'
import { organizationResolver } from '../Organization'

/**
 * A course or class offered by an educational institution.
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
   * The course code or identifier.
   */
  courseCode?: string
  /**
   * The educational level of the course.
   */
  educationalLevel?: string
  /**
   * The duration of the course.
   */
  timeRequired?: string
  /**
   * A reference to an Organization piece, representing the organization offering the course.
   */
  provider?: NodeRelation<Organization>
}

export interface Course extends CourseSimple {}

export const courseResolver = defineSchemaOrgResolver<Course>({
  defaults: {
    '@type': 'Course',
  },
  resolve(node, ctx) {
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
