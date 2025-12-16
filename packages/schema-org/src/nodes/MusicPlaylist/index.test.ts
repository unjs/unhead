import { expect } from 'vitest'
import { defineMusicPlaylist, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineMusicPlaylist', () => {
  it('can be defined', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineMusicPlaylist({
          name: 'Best of Rock 2024',
          numTracks: 25,
          creator: {
            name: 'Jane Doe',
          },
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#/schema/music-playlist/c9e0b25",
            "@type": "MusicPlaylist",
            "creator": {
              "@type": "Person",
              "name": "Jane Doe",
            },
            "name": "Best of Rock 2024",
            "numTracks": 25,
          },
        ]
      `)
    })
  })
})
