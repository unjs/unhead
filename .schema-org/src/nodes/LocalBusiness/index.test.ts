import { describe, expect, it } from 'vitest'
import { injectSchemaOrg, useSetup } from '../../../.test'
import { defineLocalBusiness, useSchemaOrg } from '../../'

describe('defineLocalBusiness', () => {
  it('can be registered', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineLocalBusiness({
          '@type': 'Dentist',
          'name': 'test',
          'logo': '/logo.png',
          'address': {
            addressCountry: 'Australia',
            postalCode: '2000',
            streetAddress: '123 st',
          },
          'openingHoursSpecification': [
            {
              dayOfWeek: 'Saturday',
              opens: '09:30',
              closes: '13:30',
            },
            {
              dayOfWeek: ['Monday', 'Tuesday'],
              opens: '10:30',
              closes: '15:30',
            },
          ],
        }),
      ])

      const graphNodes = await injectSchemaOrg()

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#identity",
            "@type": [
              "Organization",
              "LocalBusiness",
              "Dentist",
            ],
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "Australia",
              "postalCode": "2000",
              "streetAddress": "123 st",
            },
            "currenciesAccepted": "AUD",
            "logo": {
              "@id": "https://example.com/#logo",
              "@type": "ImageObject",
              "caption": "test",
              "contentUrl": "https://example.com/logo.png",
              "inLanguage": "en-AU",
              "url": "https://example.com/logo.png",
            },
            "name": "test",
            "openingHoursSpecification": [
              {
                "@type": "OpeningHoursSpecification",
                "closes": "13:30",
                "dayOfWeek": "Saturday",
                "opens": "09:30",
              },
              {
                "@type": "OpeningHoursSpecification",
                "closes": "15:30",
                "dayOfWeek": [
                  "Monday",
                  "Tuesday",
                ],
                "opens": "10:30",
              },
            ],
            "url": "https://example.com/",
          },
        ]
      `)
    })
  })
})
