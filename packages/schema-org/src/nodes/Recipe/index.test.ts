import { expect } from 'vitest'
import { defineRecipe, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineRecipe', () => {
  it('can be defined', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineRecipe({
          name: 'Peanut Butter Cookies',
          image: 'https://example.com/photos/1x1/photo.jpg',
          recipeInstructions: [
            'Bake at 200*C for 40 minutes, or until golden-brown, stirring periodically throughout',
            'Eat them up',
          ],
          recipeIngredient: ['Peanut Butter', 'Cookie Dough'],
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#recipe",
            "@type": "Recipe",
            "image": {
              "@id": "https://example.com/#/schema/image/1",
            },
            "name": "Peanut Butter Cookies",
            "recipeIngredient": [
              "Peanut Butter",
              "Cookie Dough",
            ],
            "recipeInstructions": [
              {
                "@type": "HowToStep",
                "text": "Bake at 200*C for 40 minutes, or until golden-brown, stirring periodically throughout",
              },
              {
                "@type": "HowToStep",
                "text": "Eat them up",
              },
            ],
          },
          {
            "@id": "https://example.com/#/schema/image/1",
            "@type": "ImageObject",
            "contentUrl": "https://example.com/photos/1x1/photo.jpg",
            "inLanguage": "en-AU",
            "url": "https://example.com/photos/1x1/photo.jpg",
          },
        ]
      `)
    })
  })

  it('resolves sections, organization authors, and ratings', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineRecipe({
          name: 'Bread',
          image: ['/bread-square.jpg', '/bread-wide.jpg'],
          author: {
            '@type': 'Organization',
            'name': 'Test Kitchen',
          },
          aggregateRating: {
            ratingValue: 4.8,
            ratingCount: 12,
          },
          recipeInstructions: {
            name: 'Bake',
            itemListElement: [
              'Preheat the oven.',
              {
                text: 'Bake the loaf.',
                video: {
                  name: 'Bake the loaf',
                  thumbnailUrl: '/poster.jpg',
                  uploadDate: '2026-01-01',
                  contentUrl: '/bake.mp4',
                },
              },
            ],
          },
          recipeYield: [1, '1 loaf'],
        }),
      ])

      const graph = await injectSchemaOrg(head)
      const recipe = graph.find(node => node['@type'] === 'Recipe')

      expect(recipe).toMatchObject({
        aggregateRating: {
          '@type': 'AggregateRating',
        },
        author: {
          '@id': 'https://example.com/#/schema/organization/1',
        },
        recipeInstructions: {
          '@type': 'HowToSection',
          'itemListElement': [
            {
              '@type': 'HowToStep',
            },
            {
              '@type': 'HowToStep',
              'video': {
                '@type': 'VideoObject',
              },
            },
          ],
        },
      })
    })
  })
})
