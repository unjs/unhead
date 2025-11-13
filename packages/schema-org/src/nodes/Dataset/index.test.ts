import { expect } from 'vitest'
import { defineDataset, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineDataset', () => {
  it('can be defined', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineDataset({
          name: 'Global Temperature Data 2000-2024',
          description: 'Comprehensive global temperature measurements',
          keywords: ['climate', 'temperature', 'weather'],
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#dataset",
            "@type": "Dataset",
            "description": "Comprehensive global temperature measurements",
            "keywords": [
              "climate",
              "temperature",
              "weather",
            ],
            "name": "Global Temperature Data 2000-2024",
            "url": "https://example.com/",
          },
        ]
      `)
    })
  })
})
