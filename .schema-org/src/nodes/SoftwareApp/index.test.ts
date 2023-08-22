import { expect } from 'vitest'
import { injectSchemaOrg, useSetup } from '../../../.test'
import { defineSoftwareApp, useSchemaOrg } from '../../'

describe('defineSoftwareApp', () => {
  it('can be defined', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineSoftwareApp({
          name: 'Angry Birds',
          operatingSystem: 'ANDROID',
          applicationCategory: 'GameApplication',
          aggregateRating: {
            ratingValue: '4.6',
            ratingCount: 8864,
          },
          offers: {
            priceValidUntil: '2023-12-30T00:00:00.000Z',
            price: '1.00',
            priceCurrency: 'USD',
          },
        }),
      ])

      const graphNodes = await injectSchemaOrg()

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@type": "SoftwareApplication",
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingCount": 8864,
              "ratingValue": "4.6",
            },
            "applicationCategory": "GameApplication",
            "name": "Angry Birds",
            "offers": {
              "@type": "Offer",
              "availability": "https://schema.org/InStock",
              "price": "1.00",
              "priceCurrency": "USD",
              "priceValidUntil": "2023-12-30T00:00:00.000Z",
            },
            "operatingSystem": "ANDROID",
          },
        ]
      `)
    })
  })
})
