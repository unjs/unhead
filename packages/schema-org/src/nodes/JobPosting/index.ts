import type { NodeRelation, ResolvableDate, Thing } from '../../types'
import type { MonetaryAmount } from '../MonetaryAmount'
import type { Organization } from '../Organization'
import type { Person } from '../Person'
import type { Place } from '../Place'
import type { WebPage } from '../WebPage'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
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
   * The physical location(s) of the business where the employee will report to work (such as an office or worksite),
   * not the location where the job was posted. Include as many properties as possible. The more properties you provide,
   * the higher quality the job posting is to our users. Note that you must include the addressCountry property.
   */
  jobLocation: NodeRelation<Place>

  /**
   * The title of the job (not the title of the posting). For example, "Software Engineer" or "Barista"
   */
  title: string

  /**
   * The actual base salary for the job, as provided by the employer (not an estimate).
   */
  baseSalary?: MonetaryAmount

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
   * A description of the job location (e.g. TELECOMMUTE for telecommute jobs).
   */
  jobLocationType?: 'TELECOMMUTE'

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
  educationRequirements?: string
  /**
   * Description of the level of experience required for the job.
   */
  experienceRequirements?: string
  /**
   * Skills, abilities, or knowledge needed for the job.
   */
  qualifications?: string
}

export interface JobPosting extends JobPostingSimple {}

export const jobPostingResolver = defineSchemaOrgResolver<JobPosting>({
  defaults: {
    '@type': 'JobPosting',
  },
  idPrefix: ['url', '#job-posting'],
  resolve(node, ctx) {
    node.datePosted = resolvableDateToIso(node.datePosted)!
    node.hiringOrganization = resolveRelation(node.hiringOrganization, ctx, organizationResolver)
    node.jobLocation = resolveRelation(node.jobLocation, ctx, placeResolver)
    node.baseSalary = resolveRelation(node.baseSalary, ctx, monetaryAmountResolver)
    node.validThrough = resolvableDateToIso(node.validThrough)
    return node
  },
  resolveRootNode(jobPosting, { find }) {
    const webPage = find<WebPage>(PrimaryWebPageId)
    const identity = find<Person | Organization>(IdentityId)

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
