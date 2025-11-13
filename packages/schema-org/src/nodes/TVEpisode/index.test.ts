import { expect } from 'vitest'
import { defineTVEpisode, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineTVEpisode', () => {
  it('can be defined', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineTVEpisode({
          name: 'Pilot',
          episodeNumber: 1,
          duration: 'PT58M',
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#/schema/tvepisode/17ded41",
            "@type": "TVEpisode",
            "duration": "PT58M",
            "episodeNumber": 1,
            "name": "Pilot",
          },
        ]
      `)
    })
  })
})
