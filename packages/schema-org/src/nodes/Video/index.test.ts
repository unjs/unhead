import { expect } from 'vitest'
import { defineVideo, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineVideo', () => {
  it('can be registered', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineVideo({
          name: 'My cool video',
          uploadDate: new Date(Date.UTC(2020, 10, 10)),
          url: '/image.png',
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#/schema/video/1",
            "@type": "VideoObject",
            "description": "No description",
            "inLanguage": "en-AU",
            "name": "My cool video",
            "uploadDate": "2020-11-10T00:00:00.000Z",
            "url": "https://example.com/image.png",
          },
        ]
      `)
    })
  })

  it('resolves thumbnail independently from thumbnailUrl', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineVideo({
          name: 'My cool video',
          url: '/video.mp4',
          thumbnail: {
            name: 'Poster image',
            url: '/poster.jpg',
          },
          thumbnailUrl: '/fallback.jpg',
        }),
      ])

      const [video] = await injectSchemaOrg(head)

      expect(video.thumbnail).toEqual({
        '@type': 'ImageObject',
        'contentUrl': 'https://example.com/poster.jpg',
        'inLanguage': 'en-AU',
        'name': 'Poster image',
        'url': 'https://example.com/poster.jpg',
      })
      expect(video.thumbnailUrl).toBe('https://example.com/fallback.jpg')
    })
  })

  it('uses the first image URL as the thumbnailUrl fallback', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineVideo({
          name: 'My cool video',
          url: '/video.mp4',
          image: ['/poster.jpg', '/alternate.jpg'],
        }),
      ])

      const [video] = await injectSchemaOrg(head)

      expect(video.thumbnail).toBeUndefined()
      expect(video.thumbnailUrl).toBe('https://example.com/poster.jpg')
    })
  })
})
