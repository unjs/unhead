import { expect } from 'vitest'
import { defineMusicAlbum, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineMusicAlbum', () => {
  it('can be defined', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineMusicAlbum({
          name: 'Abbey Road',
          byArtist: 'The Beatles',
          albumProductionType: 'StudioAlbum',
          numTracks: 17,
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#/schema/music-album/c7deba0",
            "@type": "MusicAlbum",
            "albumProductionType": "StudioAlbum",
            "byArtist": {
              "@type": "Person",
              "name": "The Beatles",
            },
            "name": "Abbey Road",
            "numTracks": 17,
          },
        ]
      `)
    })
  })
})
