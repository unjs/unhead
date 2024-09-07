import { describe, expect, it } from 'vitest'
import { defineFoodEstablishment, useSchemaOrg } from '../..'
import { injectSchemaOrg, useSetup } from '../../../.test'

describe('defineLocalBusiness', () => {
  it('can be registered', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineFoodEstablishment({
          '@type': 'BarOrPub',
          'servesCuisine': 'Traditional food',
          'hasMenu': 'https://www.test.com/menu.pdf',
          'acceptsReservations': 'https://www.test.com/reserve',
          'starRating': { ratingValue: 4, worstRating: 1, bestRating: 5 },
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
          'url': 'https://www.test.com',
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
              "FoodEstablishment",
              "BarOrPub",
            ],
            "acceptsReservations": "https://www.test.com/reserve",
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "Australia",
              "postalCode": "2000",
              "streetAddress": "123 st",
            },
            "currenciesAccepted": "AUD",
            "hasMenu": "https://www.test.com/menu.pdf",
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
            "servesCuisine": "Traditional food",
            "starRating": {
              "@type": "Rating",
              "bestRating": 5,
              "ratingValue": 4,
              "worstRating": 1,
            },
            "url": "https://www.test.com",
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
            "url": "https://www.test.com",
          },
        ]
      `)
    })
  })

  it('can be registered with boolean acceptsReservation', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineFoodEstablishment({
          '@type': 'BarOrPub',
          'acceptsReservations': true,
          'name': 'test',
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
              "FoodEstablishment",
              "BarOrPub",
            ],
            "acceptsReservations": true,
            "currenciesAccepted": "AUD",
            "name": "test",
            "url": "https://example.com/",
          },
        ]
      `)
    })
  })
})
