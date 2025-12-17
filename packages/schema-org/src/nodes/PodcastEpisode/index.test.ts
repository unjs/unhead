import { expect } from 'vitest'
import { definePodcastEpisode, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('definePodcastEpisode', () => {
  it('can be defined', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        definePodcastEpisode({
          name: 'Episode 1: Getting Started',
          url: 'https://example.com/podcast/episode-1',
          audio: 'https://example.com/podcast/ep1.mp3',
          duration: 'PT45M',
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#/schema/podcast-episode/1",
            "@type": "PodcastEpisode",
            "audio": "https://example.com/podcast/ep1.mp3",
            "duration": "PT45M",
            "inLanguage": "en-AU",
            "name": "Episode 1: Getting Started",
            "url": "https://example.com/podcast/episode-1",
          },
        ]
      `)
    })
  })
})
