import { describe, expect, it } from 'vitest'
import { injectSchemaOrg, useSetup } from '../../../.test'
import { defineItemList, defineListItem, defineMovie, useSchemaOrg } from '../..'

describe('defineItemList', () => {
  it('movie example', async () => {
    await useSetup(async () => {
      // see https://developers.google.com/search/docs/appearance/structured-data/movie#single
      useSchemaOrg([
        defineItemList({
          itemListElement: [
            {
              item: defineMovie({
                url: 'https://example.com/2019-best-picture-noms#a-star-is-born',
                name: 'A Star Is Born',
                image: 'https://example.com/a-star-is-born.jpg',
                dateCreated: '2018-09-05',
                director: 'Bradley Cooper',
                review: {
                  reviewRating: 5,
                  author: 'John D.',
                  reviewBody: 'Heartbreaking, inpsiring, moving. Bradley Cooper is a triple threat.',
                },
                aggregateRating: {
                  ratingValue: 4.5,
                  bestRating: 5,
                  ratingCount: 1000,
                },
              }),
            },
            defineListItem({
              item: defineMovie({
                url: 'https://example.com/2019-best-picture-noms#a-star-is-born',
                name: 'Bohemian Rhapsody',
                image: 'https://example.com/a-star-is-born.jpg',
              }),
            }),
          ],
        }),
      ])

      const nodes = await injectSchemaOrg()

      expect(nodes).toMatchInlineSnapshot(`
        [
          {
            "@type": "ItemList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "item": {
                  "@type": "Movie",
                  "aggregateRating": {
                    "@type": "AggregateRating",
                    "bestRating": 5,
                    "ratingCount": 1000,
                    "ratingValue": 4.5,
                  },
                  "dateCreated": "2018-8-5",
                  "director": {
                    "@type": "Person",
                    "name": "Bradley Cooper",
                  },
                  "image": "https://example.com/a-star-is-born.jpg",
                  "name": "A Star Is Born",
                  "review": {
                    "@type": "Review",
                    "author": {
                      "@type": "Person",
                      "name": "John D.",
                    },
                    "inLanguage": "en-AU",
                    "reviewBody": "Heartbreaking, inpsiring, moving. Bradley Cooper is a triple threat.",
                    "reviewRating": {
                      "@type": "Rating",
                      "bestRating": 5,
                      "worstRating": 1,
                    },
                  },
                  "url": "https://example.com/2019-best-picture-noms#a-star-is-born",
                },
                "position": 1,
              },
              {
                "@type": "ListItem",
                "item": {
                  "@type": "Movie",
                  "image": "https://example.com/a-star-is-born.jpg",
                  "name": "Bohemian Rhapsody",
                  "url": "https://example.com/2019-best-picture-noms#a-star-is-born",
                },
                "position": 2,
              },
            ],
          },
        ]
      `)
    })
  })
})
