import { describe, expect, it } from 'vitest'
import { defineEmployerAggregateRating, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineEmployerAggregateRating', () => {
  it('resolves the rated organization', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineEmployerAggregateRating({
          itemReviewed: {
            name: 'World’s Best Coffee Shop',
            sameAs: 'https://coffee.example.com',
          },
          ratingCount: 25,
          ratingValue: 4.4,
        }),
      ])

      expect(await injectSchemaOrg(head)).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#employer-aggregate-rating",
            "@type": "EmployerAggregateRating",
            "itemReviewed": {
              "@id": "https://example.com/#/schema/organization/1",
            },
            "ratingCount": 25,
            "ratingValue": 4.4,
          },
          {
            "@id": "https://example.com/#/schema/organization/1",
            "@type": "Organization",
            "name": "World’s Best Coffee Shop",
            "sameAs": "https://coffee.example.com",
            "url": "https://example.com/",
          },
        ]
      `)
    })
  })
})
