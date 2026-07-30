import { expect } from 'vitest'
import { defineJobPosting, useSchemaOrg } from '../..'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineJobPosting', () => {
  it('can be registered', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineJobPosting({
          datePosted: '2023-04-01',
          description: '<p>job description</p>',
          hiringOrganization: {
            name: 'Organization inc',

          },
          // @ts-expect-error untyped
          jobLocation: {
            address: 'Some postalcode',
            latitude: 50.1,
            longitude: 4.8,
          },
          title: 'Job posting title',
          employmentType: ['FULL_TIME', 'PART_TIME'],
          validThrough: '2024-04-01',
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#job-posting",
            "@type": "JobPosting",
            "datePosted": "2023-04-01",
            "description": "<p>job description</p>",
            "employmentType": [
              "FULL_TIME",
              "PART_TIME",
            ],
            "hiringOrganization": {
              "@type": "Organization",
              "name": "Organization inc",
              "url": "https://example.com/",
            },
            "jobLocation": {
              "@type": "Place",
              "address": "Some postalcode",
              "latitude": 50.1,
              "longitude": 4.8,
            },
            "title": "Job posting title",
            "validThrough": "2024-04-01",
          },
        ]
      `)
    })
  })

  it('supports fully remote job requirements', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineJobPosting({
          title: 'Maintainer',
          description: 'Maintain Unhead',
          datePosted: new Date('2026-01-01T00:00:00.000Z'),
          hiringOrganization: {
            name: 'Unhead',
          },
          jobLocationType: 'TELECOMMUTE',
          applicantLocationRequirements: {
            '@type': 'Country',
            'name': 'Australia',
          },
          educationRequirements: {
            credentialCategory: 'bachelor degree',
          },
          experienceRequirements: {
            monthsOfExperience: 24,
          },
          identifier: {
            name: 'Job ID',
            value: 'maintainer-1',
          },
        }),
      ])

      const [job] = await injectSchemaOrg(head)

      expect(job).toMatchObject({
        applicantLocationRequirements: {
          '@type': 'Country',
        },
        datePosted: '2026-01-01T00:00:00.000Z',
        educationRequirements: {
          '@type': 'EducationalOccupationalCredential',
        },
        experienceRequirements: {
          '@type': 'OccupationalExperienceRequirements',
        },
        identifier: {
          '@type': 'PropertyValue',
        },
        jobLocationType: 'TELECOMMUTE',
      })
      expect(job).not.toHaveProperty('jobLocation')
    })
  })
})
