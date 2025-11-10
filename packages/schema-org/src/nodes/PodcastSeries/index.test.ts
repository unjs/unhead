import { expect } from 'vitest'
import { useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'
import { podcastSeriesResolver } from './index'

const definePodcastSeries = (input: any) => {
  return {
    ...input,
    _resolver: podcastSeriesResolver,
  }
}

describe('definePodcastSeries', () => {
  it('can be defined', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        definePodcastSeries({
          name: 'The Example Podcast',
          description: 'A podcast about interesting topics',
          url: 'https://example.com/podcast',
          webFeed: 'https://example.com/podcast/feed.rss',
          image: 'https://example.com/podcast-cover.jpg',
          author: {
            name: 'Jane Doe',
          },
          numberOfEpisodes: 42,
          genre: ['Technology', 'Education'],
          datePublished: '2023-01-01',
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#/schema/podcast-series/1234567",
            "@type": "PodcastSeries",
            "author": {
              "@type": "Person",
              "name": "Jane Doe",
            },
            "datePublished": "2023-1-1",
            "description": "A podcast about interesting topics",
            "genre": [
              "Technology",
              "Education",
            ],
            "image": {
              "@id": "https://example.com/#/schema/image/abcdefg",
            },
            "name": "The Example Podcast",
            "numberOfEpisodes": 42,
            "url": "https://example.com/podcast",
            "webFeed": "https://example.com/podcast/feed.rss",
          },
          {
            "@id": "https://example.com/#/schema/image/abcdefg",
            "@type": "ImageObject",
            "contentUrl": "https://example.com/podcast-cover.jpg",
            "inLanguage": "en-AU",
            "url": "https://example.com/podcast-cover.jpg",
          },
        ]
      `)
    })
  })
})
