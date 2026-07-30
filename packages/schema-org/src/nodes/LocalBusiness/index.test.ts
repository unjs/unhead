import { describe, expect, it } from 'vitest'
import { defineLocalBusiness, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineLocalBusiness', () => {
  it('can be registered', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
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

      const graphNodes = await injectSchemaOrg(head)

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
          {
            "@id": "https://example.com/#logo",
            "@type": "ImageObject",
            "caption": "test",
            "contentUrl": "https://example.com/logo.png",
            "inLanguage": "en-AU",
            "url": "https://example.com/logo.png",
          },
          {
            "@id": "https://example.com/#organization",
            "@type": "Organization",
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "Australia",
              "postalCode": "2000",
              "streetAddress": "123 st",
            },
            "logo": "https://example.com/logo.png",
            "name": "test",
            "url": "https://example.com/",
          },
        ]
      `)
    })
  })

  it('can have custom id', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineLocalBusiness({
          '@type': 'Dentist',
          'name': 'test',
          'address': {
            addressCountry: 'Australia',
            postalCode: '2000',
            streetAddress: '123 st',
          },
          '@id': 'https://example.com/place/123#identity',
          'url': 'https://www.test.com',
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/place/123#identity",
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
            "name": "test",
            "url": "https://www.test.com",
          },
        ]
      `)
    })
  })

  it('support multiple local businesses', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineLocalBusiness({
          '@id': '#my-biz-123',
          'name': 'My Custom Business',
          'logo': '/logo-1.png',
          'address': {
            addressCountry: 'Australia',
          },
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#/schema/organization/#my-biz-123",
            "@type": [
              "Organization",
              "LocalBusiness",
            ],
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "Australia",
            },
            "currenciesAccepted": "AUD",
            "logo": "/logo-1.png",
            "name": "My Custom Business",
            "url": "https://example.com/",
          },
        ]
      `)
    })
  })

  it('resolves Google LocalBusiness fields', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineLocalBusiness({
          name: 'Harbor Cafe',
          address: {
            addressCountry: 'AU',
          },
          aggregateRating: {
            ratingCount: 5,
            ratingValue: 4.6,
          },
          department: {
            name: 'Harbor Cafe Bakery',
            address: {
              addressCountry: 'AU',
            },
          },
          geo: {
            latitude: -38.1,
            longitude: 144.3,
          },
          menu: '/menu',
          review: {
            author: 'Ada',
            reviewRating: 5,
          },
          servesCuisine: ['Cafe', 'Bakery'],
        }),
      ])

      const [business] = await injectSchemaOrg(head)

      expect(business).toMatchObject({
        aggregateRating: {
          '@type': 'AggregateRating',
        },
        department: {
          '@type': [
            'Organization',
            'LocalBusiness',
          ],
        },
        geo: {
          '@type': 'GeoCoordinates',
        },
        menu: 'https://example.com/menu',
        review: {
          '@type': 'Review',
        },
      })
    })
  })
})
