import { expect } from 'vitest'
import { useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'
import { podcastEpisodeResolver } from './index'

const definePodcastEpisode = (input: any) => {
  return {
    ...input,
    _resolver: podcastEpisodeResolver,
  }
}

describe('definePodcastEpisode', () => {
  it('can be defined', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        definePodcastEpisode({
          name: 'Episode 1: Getting Started',
          description: 'In this first episode, we discuss the basics',
          url: 'https://example.com/podcast/episode-1',
          episodeNumber: 1,
          datePublished: '2023-01-15',
          duration: 'PT45M',
          audio: 'https://example.com/podcast/episode-1.mp3',
          image: 'https://example.com/podcast-episode-1.jpg',
          author: {
            name: 'Jane Doe',
          },
          transcript: 'https://example.com/podcast/episode-1/transcript',
          partOfSeries: {
            '@id': 'https://example.com/#/schema/podcast-series/main',
          },
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#/schema/podcast-episode/1234567",
            "@type": "PodcastEpisode",
            "audio": "https://example.com/podcast/episode-1.mp3",
            "author": {
              "@type": "Person",
              "name": "Jane Doe",
            },
            "datePublished": "2023-1-15",
            "description": "In this first episode, we discuss the basics",
            "duration": "PT45M",
            "episodeNumber": 1,
            "image": {
              "@id": "https://example.com/#/schema/image/abcdefg",
            },
            "inLanguage": "en-AU",
            "name": "Episode 1: Getting Started",
            "partOfSeries": {
              "@id": "https://example.com/#/schema/podcast-series/main",
            },
            "transcript": "https://example.com/podcast/episode-1/transcript",
            "url": "https://example.com/podcast/episode-1",
          },
          {
            "@id": "https://example.com/#/schema/image/abcdefg",
            "@type": "ImageObject",
            "contentUrl": "https://example.com/podcast-episode-1.jpg",
            "inLanguage": "en-AU",
            "url": "https://example.com/podcast-episode-1.jpg",
          },
        ]
      `)
    })
  })
})
