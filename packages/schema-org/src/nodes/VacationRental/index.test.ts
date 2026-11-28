import { describe, expect, it } from 'vitest'
import { defineVacationRental, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineVacationRental', () => {
  it('resolves a vacation rental and its accommodation', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineVacationRental({
          name: 'Beach House',
          identifier: 'beach-house-1',
          image: ['/images/beach-house-1.jpg', '/images/beach-house-2.jpg'],
          latitude: -38.14992,
          longitude: 144.36172,
          containsPlace: {
            occupancy: {
              value: 5,
            },
            additionalType: 'EntirePlace',
            amenityFeature: {
              name: 'wifi',
              value: true,
            },
            bed: {
              numberOfBeds: 1,
              typeOfBed: 'Queen',
            },
          },
          review: {
            author: 'John S.',
            reviewRating: 5,
            datePublished: new Date('2026-06-01T00:00:00.000Z'),
            contentReferenceTime: new Date('2026-05-20T00:00:00.000Z'),
          },
        }),
      ])

      expect(await injectSchemaOrg(head)).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#vacation-rental",
            "@type": "VacationRental",
            "containsPlace": {
              "@type": "Accommodation",
              "additionalType": "EntirePlace",
              "amenityFeature": {
                "@type": "LocationFeatureSpecification",
                "name": "wifi",
                "value": true,
              },
              "bed": {
                "@type": "BedDetails",
                "numberOfBeds": 1,
                "typeOfBed": "Queen",
              },
              "occupancy": {
                "@type": "QuantitativeValue",
                "value": 5,
              },
            },
            "identifier": "beach-house-1",
            "image": [
              "https://example.com/images/beach-house-1.jpg",
              "https://example.com/images/beach-house-2.jpg",
            ],
            "latitude": -38.14992,
            "longitude": 144.36172,
            "name": "Beach House",
            "review": {
              "@type": "Review",
              "author": {
                "@type": "Person",
                "name": "John S.",
              },
              "contentReferenceTime": "2026-05-20T00:00:00.000Z",
              "datePublished": "2026-06-01T00:00:00.000Z",
              "inLanguage": "en-AU",
              "reviewRating": {
                "@type": "Rating",
                "bestRating": 5,
                "ratingValue": 5,
                "worstRating": 1,
              },
            },
          },
        ]
      `)
    })
  })

  it('keeps string coordinates with five decimal places', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineVacationRental({
          name: 'Beach House',
          identifier: 'rental-1',
          image: '/rental.jpg',
          containsPlace: { occupancy: { value: 2 } },
          geo: { latitude: '37.42000', longitude: '-122.08400' },
        }),
      ])
      const rental = (await injectSchemaOrg(head)).find((n: any) => n.name === 'Beach House')
      expect(rental!.geo).toEqual({ '@type': 'GeoCoordinates', 'latitude': '37.42000', 'longitude': '-122.08400' })
    })
  })
})
