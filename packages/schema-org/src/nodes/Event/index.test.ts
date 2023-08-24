import { describe, expect, it } from 'vitest'
import { injectSchemaOrg, useSetup } from '../../../.test'
import { defineEvent, defineOrganization, useSchemaOrg } from '../../'

describe('defineEvent', () => {
  it('can be registered', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineEvent({
          name: 'test',
        }),
      ])

      const graphNodes = await injectSchemaOrg()

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#event",
            "@type": "Event",
            "inLanguage": "en-AU",
            "name": "test",
          },
        ]
      `)
    })
  })

  it('handles performing group', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineEvent({
          name: 'test',
          organizer: defineOrganization({
            '@type': 'PerformingGroup',
            'name': 'My Organisation',
          }),
        }),
      ])

      const graphNodes = await injectSchemaOrg()

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#event",
            "@type": "Event",
            "inLanguage": "en-AU",
            "name": "test",
            "organizer": {
              "@id": "https://example.com/#/schema/organization/d3d4507",
            },
          },
          {
            "@id": "https://example.com/#/schema/organization/d3d4507",
            "@type": [
              "Organization",
              "PerformingGroup",
            ],
            "name": "My Organisation",
            "url": "https://example.com/",
          },
        ]
      `)
    })
  })

  it('handles startDate with time', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineEvent({
          name: 'test',
          startDate: new Date(2021, 10, 10, 0),
        }),
      ])

      const graphNodes = await injectSchemaOrg()

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#event",
            "@type": "Event",
            "endDate": "2021-10-10",
            "inLanguage": "en-AU",
            "name": "test",
            "startDate": "2021-10-10",
          },
        ]
      `)
    })
  })

  it('handles startDate with time', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineEvent({
          name: 'test',
          startDate: '2021-10-10',
        }),
      ])

      const graphNodes = await injectSchemaOrg()

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#event",
            "@type": "Event",
            "endDate": "2021-10-10",
            "inLanguage": "en-AU",
            "name": "test",
            "startDate": "2021-10-10",
          },
        ]
      `)
    })
  })

  it('handles virtual', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineEvent({
          name: 'test',
          location: 'https://operaonline.stream5.com/',
          startDate: '2021-10-10',
        }),
      ])

      const graphNodes = await injectSchemaOrg()

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#event",
            "@type": "Event",
            "endDate": "2021-10-10",
            "inLanguage": "en-AU",
            "location": {
              "@type": "VirtualLocation",
              "url": "https://operaonline.stream5.com/",
            },
            "name": "test",
            "startDate": "2021-10-10",
          },
        ]
      `)
    })
  })

  it('replicate google example', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineEvent({
          name: 'The Adventures of Kira and Morrison',
          location: [
            'https://operaonline.stream5.com/',
            {
              name: 'Snickerpark Stadium',
              address: {
                streetAddress: '100 West Snickerpark Dr',
                addressLocality: 'Snickertown',
                postalCode: '19019',
                addressRegion: 'PA',
                addressCountry: 'US',
              },
            },
          ],
          image: [
            'https://example.com/photos/1x1/photo.jpg',
            'https://example.com/photos/4x3/photo.jpg',
            'https://example.com/photos/16x9/photo.jpg',
          ],
          organizer: {
            name: 'Kira and Morrison Music',
            url: 'https://kiraandmorrisonmusic.com',
          },
          performer: {
            '@type': 'PerformingGroup',
            'name': 'Kira and Morrison',
          },
          offers: {
            price: 30,
            url: 'https://www.example.com/event_offer/12345_201803180430',
            priceValidUntil: '2023-12-30T00:00:00.000Z',
            validFrom: new Date(Date.UTC(2024, 5, 21, 12)),
          },
          description: 'The Adventures of Kira and Morrison is coming to Snickertown in a can\'t miss performance.',
          startDate: '2025-07-21T19:00-05:00',
          endDate: '2025-07-21T23:00-05:00',
          eventStatus: 'EventScheduled',
          eventAttendanceMode: 'MixedEventAttendanceMode',
        }),
      ])

      const graphNodes = await injectSchemaOrg()

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#event",
            "@type": "Event",
            "description": "The Adventures of Kira and Morrison is coming to Snickertown in a can't miss performance.",
            "endDate": "2025-07-21T23:00-05:00",
            "eventAttendanceMode": "https://schema.org/MixedEventAttendanceMode",
            "eventStatus": "https://schema.org/EventScheduled",
            "image": [
              "https://example.com/photos/1x1/photo.jpg",
              "https://example.com/photos/4x3/photo.jpg",
              "https://example.com/photos/16x9/photo.jpg",
            ],
            "inLanguage": "en-AU",
            "location": [
              {
                "@type": "VirtualLocation",
                "url": "https://operaonline.stream5.com/",
              },
              {
                "@type": "VirtualLocation",
                "address": {
                  "addressCountry": "US",
                  "addressLocality": "Snickertown",
                  "addressRegion": "PA",
                  "postalCode": "19019",
                  "streetAddress": "100 West Snickerpark Dr",
                },
                "name": "Snickerpark Stadium",
              },
            ],
            "name": "The Adventures of Kira and Morrison",
            "offers": {
              "@type": "Offer",
              "availability": "https://schema.org/InStock",
              "price": 30,
              "priceCurrency": "USD",
              "priceValidUntil": "2023-12-30T00:00:00.000Z",
              "url": "https://www.example.com/event_offer/12345_201803180430",
              "validFrom": "2024-06-21T12:00:00.000Z",
            },
            "organizer": {
              "@id": "https://example.com/#/schema/organization/ff95f9d",
            },
            "performer": {
              "@id": "https://example.com/#/schema/performinggroup/1a358dc",
            },
            "startDate": "2025-07-21T19:00-05:00",
          },
          {
            "@id": "https://example.com/#/schema/performinggroup/1a358dc",
            "@type": "PerformingGroup",
            "name": "Kira and Morrison",
          },
          {
            "@id": "https://example.com/#/schema/organization/ff95f9d",
            "@type": "Organization",
            "name": "Kira and Morrison Music",
            "url": "https://kiraandmorrisonmusic.com",
          },
        ]
      `)
    }, {
      currency: 'USD',
    })
  })
})
