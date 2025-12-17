import { expect } from 'vitest'
import { defineMusicRecording, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineMusicRecording', () => {
  it('can be defined', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineMusicRecording({
          name: 'Bohemian Rhapsody',
          url: 'https://example.com/tracks/bohemian-rhapsody',
          byArtist: 'Queen',
          duration: 'PT5M55S',
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#/schema/music-recording/1",
            "@type": "MusicRecording",
            "byArtist": {
              "@type": "Person",
              "name": "Queen",
            },
            "duration": "PT5M55S",
            "name": "Bohemian Rhapsody",
            "url": "https://example.com/tracks/bohemian-rhapsody",
          },
        ]
      `)
    })
  })
})
