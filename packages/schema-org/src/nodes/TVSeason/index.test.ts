import { expect } from 'vitest'
import { defineTVSeason, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineTVSeason', () => {
  it('can be defined', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineTVSeason({
          seasonNumber: 2,
          numberOfEpisodes: 13,
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#/schema/tvseason/d5e7237",
            "@type": "TVSeason",
            "numberOfEpisodes": 13,
            "seasonNumber": 2,
          },
        ]
      `)
    })
  })
})
