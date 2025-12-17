import { expect } from 'vitest'
import { definePodcastSeries, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('definePodcastSeries', () => {
  it('can be defined', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        definePodcastSeries({
          name: 'The Example Podcast',
          description: 'A podcast about interesting topics',
          url: 'https://example.com/podcast',
          webFeed: 'https://example.com/podcast/feed.rss',
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#/schema/podcast-series/6a51620",
            "@type": "PodcastSeries",
            "description": "A podcast about interesting topics",
            "name": "The Example Podcast",
            "url": "https://example.com/podcast",
            "webFeed": "https://example.com/podcast/feed.rss",
          },
        ]
      `)
    })
  })
})
