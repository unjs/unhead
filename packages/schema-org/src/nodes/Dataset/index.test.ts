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

  it('resolves Google Dataset relations and URLs', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineDataset({
          name: 'Climate data',
          description: 'Daily climate observations',
          creator: {
            '@type': 'Person',
            'name': 'Ada',
          },
          funder: {
            '@type': 'Organization',
            'name': 'Climate Fund',
          },
          distribution: {
            contentUrl: '/climate.csv',
            encodingFormat: 'text/csv',
          },
          includedInDataCatalog: {
            name: 'Climate catalog',
            url: '/catalog',
          },
          hasPart: '/datasets/temperatures',
          license: '/license',
        }),
      ])

      const graph = await injectSchemaOrg(head)
      const dataset = graph.find(node => node['@type'] === 'Dataset')

      expect(dataset).toMatchObject({
        creator: {
          '@id': 'https://example.com/#/schema/person/1',
        },
        distribution: {
          '@type': 'DataDownload',
          'contentUrl': 'https://example.com/climate.csv',
        },
        funder: {
          '@id': 'https://example.com/#/schema/organization/1',
        },
        hasPart: 'https://example.com/datasets/temperatures',
        includedInDataCatalog: {
          '@type': 'DataCatalog',
          'url': 'https://example.com/catalog',
        },
        license: 'https://example.com/license',
      })
    })
  })
})
