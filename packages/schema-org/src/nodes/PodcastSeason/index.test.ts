import { expect } from 'vitest'
import { useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'
import { podcastSeasonResolver } from './index'

const definePodcastSeason = (input: any) => {
  return {
    ...input,
    _resolver: podcastSeasonResolver,
  }
}

describe('definePodcastSeason', () => {
  it('can be defined', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        definePodcastSeason({
          name: 'Season 1',
          description: 'The first season of our podcast',
          seasonNumber: 1,
          numberOfEpisodes: 12,
          url: 'https://example.com/podcast/season-1',
          datePublished: '2023-01-01',
          startDate: '2023-01-01',
          endDate: '2023-03-31',
          image: 'https://example.com/podcast-season-1.jpg',
          partOfSeries: {
            '@id': 'https://example.com/#/schema/podcast-series/main',
          },
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#/schema/podcast-season/1234567",
            "@type": "PodcastSeason",
            "datePublished": "2023-1-1",
            "description": "The first season of our podcast",
            "endDate": "2023-3-31",
            "image": {
              "@id": "https://example.com/#/schema/image/abcdefg",
            },
            "name": "Season 1",
            "numberOfEpisodes": 12,
            "partOfSeries": {
              "@id": "https://example.com/#/schema/podcast-series/main",
            },
            "seasonNumber": 1,
            "startDate": "2023-1-1",
            "url": "https://example.com/podcast/season-1",
          },
          {
            "@id": "https://example.com/#/schema/image/abcdefg",
            "@type": "ImageObject",
            "contentUrl": "https://example.com/podcast-season-1.jpg",
            "inLanguage": "en-AU",
            "url": "https://example.com/podcast-season-1.jpg",
          },
        ]
      `)
    })
  })
})
