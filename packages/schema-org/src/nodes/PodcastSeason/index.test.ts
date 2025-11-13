import { expect } from 'vitest'
import { definePodcastSeason, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('definePodcastSeason', () => {
  it('can be defined', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        definePodcastSeason({
          seasonNumber: 2,
          numberOfEpisodes: 12,
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#/schema/podcast-season/7b8b021",
            "@type": "PodcastSeason",
            "numberOfEpisodes": 12,
            "seasonNumber": 2,
          },
        ]
      `)
    })
  })
})
