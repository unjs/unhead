import type { NodeRelation, NodeRelations, PropertyValue, ResolvableDate, SchemaOrgNodeDefinition, Thing } from '../../types'
import type { MonetaryAmount } from '../MonetaryAmount'
import type { Organization } from '../Organization'
import type { Place } from '../Place'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { propertyValueResolver } from '../../core/common'
import { IdentityId, idReference, resolvableDateToIso, setIfEmpty } from '../../utils'
import { monetaryAmountResolver } from '../MonetaryAmount'
import { organizationResolver } from '../Organization'
import { placeResolver } from '../Place'
import { PrimaryWebPageId } from '../WebPage'

/**
 * A listing that describes a job opening in a certain organization.
 */
export interface JobPostingSimple extends Thing {
  /**
   * The original date that employer posted the job in ISO 8601 format.
   * For example, "2017-01-24" or "2017-01-24T19:33:17+00:00".
   */
  datePosted: ResolvableDate

  /**
   * The full description of the job in HTML format.
   *
   * The description must be a complete representation of the job, including job responsibilities, qualifications,
   * skills, working hours, education requirements, and experience requirements. The description can't be the same as
   * the title
   */
  description: string

  /**
   * The organization offering the job position. This must be the name of the company (for example, "Starbucks, Inc"),
   * and not the specific location that is hiring (for example, "Starbucks on Main Street").
   */
  hiringOrganization: NodeRelation<Organization>

  /**
   * The title of the job (not the title of the posting). For example, "Software Engineer" or "Barista"
   */
  title: string

  /**
   * The actual base salary for the job, as provided by the employer (not an estimate).
   */
  baseSalary?: NodeRelation<MonetaryAmount>

  /**
   * Type of employment
   */
  employmentType?: EmploymentType | EmploymentType[]

  /**
   * The date when the job posting will expire in ISO 8601 format. For example, "2017-02-24"
   * or "2017-02-24T19:33:17+00:00".
   */
  validThrough?: ResolvableDate

  /**
   * Indicates whether the URL that's associated with this job posting enables direct application for the job.
   */
  directApply?: boolean
  /**
   * Description of benefits associated with the job.
   */
  jobBenefits?: string
  /**
   * Educational credentials or qualifications required for the job.
   */
  educationRequirements?: NodeRelations<EducationalOccupationalCredential | string>
  /**
   * Description of the level of experience required for the job.
   */
  experienceRequirements?: NodeRelations<OccupationalExperienceRequirements | string>
  /**
   * Skills, abilities, or knowledge needed for the job.
   */
  qualifications?: string
  /**
   * An employer-specific identifier for the job.
   */
  identifier?: NodeRelation<PropertyValue | string>
  /**
   * Whether experience can substitute for education.
   */
  experienceInPlaceOfEducation?: boolean
}

export interface EducationalOccupationalCredential extends Thing {
  '@type'?: 'EducationalOccupationalCredential'
  'credentialCategory'?: string
}

export interface OccupationalExperienceRequirements extends Thing {
  '@type'?: 'OccupationalExperienceRequirements'
  'monthsOfExperience'?: number
}

export interface JobLocationRequirement extends Thing {
  '@type'?: 'AdministrativeArea' | 'Country' | 'State'
  'name': string
}

type JobLocation
  = | {
    jobLocation: NodeRelations<Place>
    jobLocationType?: never
    applicantLocationRequirements?: NodeRelations<JobLocationRequirement>
  }
  | {
    jobLocation?: NodeRelations<Place>
    jobLocationType: 'TELECOMMUTE'
    applicantLocationRequirements: NodeRelations<JobLocationRequirement>
  }

export type JobPosting = JobPostingSimple & JobLocation

const credentialResolver = defineSchemaOrgResolver<EducationalOccupationalCredential>({
  defaults: {
    '@type': 'EducationalOccupationalCredential',
  },
})

const experienceRequirementsResolver = defineSchemaOrgResolver<OccupationalExperienceRequirements>({
  defaults: {
    '@type': 'OccupationalExperienceRequirements',
  },
})

const jobLocationRequirementResolver = defineSchemaOrgResolver<JobLocationRequirement>({
  defaults: {
    '@type': 'AdministrativeArea',
  },
})

export const jobPostingResolver = defineSchemaOrgResolver<JobPosting>({
  defaults: {
    '@type': 'JobPosting',
  },
  idPrefix: ['url', '#job-posting'],
  resolve(node, ctx) {
    const resolveObjects = <T extends Thing>(input: NodeRelations<T | string> | undefined, resolver: SchemaOrgNodeDefinition<T>) => {
      if (!input)
        return input
      const values = Array.isArray(input) ? input : [input]
      const resolved = values.map(value => typeof value === 'object' ? resolveRelation(value, ctx, resolver) : value)
      return Array.isArray(input) ? resolved : resolved[0]
    }

    node.datePosted = resolvableDateToIso(node.datePosted)!
    node.applicantLocationRequirements = resolveRelation(node.applicantLocationRequirements, ctx, jobLocationRequirementResolver)
    node.educationRequirements = resolveObjects(node.educationRequirements, credentialResolver)
    node.experienceRequirements = resolveObjects(node.experienceRequirements, experienceRequirementsResolver)
    node.hiringOrganization = resolveRelation(node.hiringOrganization, ctx, organizationResolver)
    node.jobLocation = resolveRelation(node.jobLocation, ctx, placeResolver)
    if (typeof node.identifier === 'object')
      node.identifier = resolveRelation(node.identifier, ctx, propertyValueResolver)
    node.baseSalary = resolveRelation(node.baseSalary, ctx, monetaryAmountResolver)
    node.validThrough = resolvableDateToIso(node.validThrough)
    return node
  },
  resolveRootNode(jobPosting, { find }) {
    const webPage = find(PrimaryWebPageId)
    const identity = find(IdentityId)

    if (identity)
      setIfEmpty(jobPosting, 'hiringOrganization', idReference(identity))

    if (webPage)
      setIfEmpty(jobPosting, 'mainEntityOfPage', idReference(webPage))

    return jobPosting
  },
})

type EmploymentType
  = 'FULL_TIME'
    | 'PART_TIME'
    | 'CONTRACTOR'
    | 'TEMPORARY'
    | 'INTERN'
    | 'VOLUNTEER'
    | 'PER_DIEM'
    | 'OTHER'
