## Schema.org Job Posting

- **Type**: `defineJobPosting(input: JobPosting)`{lang="ts"}

  Describes an `Product` on a `WebPage`.

- **Component**: `SchemaOrgJobPosting` _(see [how components work](/schema-org/getting-started/vue-components))_

## Useful Links

- [JobPosting - Schema.org](https://schema.org/JobPosting)
- [JobPosting Schema Markup - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/job-posting)

## Required properties

- **title** `string`

  The title of the job (not the title of the posting). For example, "Software Engineer" or "Barista"


- **description**  `string`

  The full description of the job in HTML format.

- **hiringOrganization** [Organization](/schema-org/schema/organization)

  The organization offering the job position.

- **jobLocation** `Place`

  The location(s) where the job is available.

- **datePosted** `ResolvableDate`

  Publication date for the job posting.

## Recommended Properties

- **employmentType** `string`

  Type of employment (e.g. full-time, part-time, contract, temporary, seasonal, internship).

- **validThrough** `ResolvableDate`

  The date after when the item is not valid. For example the end of an offer, salary period, or a period of opening hours.

- **applicantLocationRequirements** - `AdministrativeArea`

  The region(s) of the organization where the job is available.

- **baseSalary** - `MonetaryAmount`

  The base salary of the job or of an employee in an EmployeeRole.

- **directApply** - `boolean`

  Indicates whether direct application is allowed.

- **identifier** - `string`

  An identifier for the job posting, unique within the hiring organization.

- **jobLocationType** - `string`

  A description of the job location (e.g TELECOMMUTE for telecommute jobs).

## Defaults

- **@type**: `JobPosting`
- **@id**: `${canonicalUrl}#job-posting`
- **hiringOrganization**: id reference of the identity
- **mainEntityOfPage** id reference of the web page

## Resolves

See [Global Resolves](/guide/getting-started/how-it-works#global-resolves) for full context.

- `datePosted` - Date
- `hiringOrganization` - Organization
- `jobLocation` - Place
- `baseSalary` - MonetaryAmount
- `validThrough` - Date

## Examples

### Simple

```ts
defineJobPosting({
  title: 'Software Engineer',
  description: 'We are looking for a Software Engineer to join our team to help us build Unhead.',
  hiringOrganization: {
    name: 'Unhead',
  },
  jobLocation: {
    address: {
      streetAddress: '1600 Amphitheatre Pkwy',
      addressLocality: 'Mountain View',
      addressRegion: 'CA',
      postalCode: '94043',
      addressCountry: 'US',
    }
  },
  baseSalary: {
    currency: 'USD',
    value: {
      value: 100000,
      unitText: 'YEAR',
    },
  },
  employmentType: 'FULL_TIME',
  validThrough: '2022-02-01',
  datePosted: '2022-01-01',
})
```

## Types

```ts
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
}
```
