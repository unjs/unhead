import { expect } from 'vitest'
import { defineTVSeries, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineTVSeries', () => {
  it('can be defined', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineTVSeries({
          name: 'Breaking Bad',
          numberOfSeasons: 5,
          numberOfEpisodes: 62,
          genre: ['Crime', 'Drama'],
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#/schema/tvseries/1",
            "@type": "TVSeries",
            "genre": [
              "Crime",
              "Drama",
            ],
            "name": "Breaking Bad",
            "numberOfEpisodes": 62,
            "numberOfSeasons": 5,
          },
        ]
      `)
    })
  })
})
