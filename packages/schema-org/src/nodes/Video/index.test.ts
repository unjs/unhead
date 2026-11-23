import { expect } from 'vitest'
import { defineMovie, defineVideo, useSchemaOrg } from '../../'
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

  it('supports Google video enhancements without a generic url', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineVideo({
          name: 'Launch stream',
          thumbnailUrl: '/poster.jpg',
          uploadDate: new Date(Date.UTC(2026, 0, 1)),
          contentUrl: '/video.mp4',
          expires: new Date(Date.UTC(2026, 1, 1)),
          regionsAllowed: ['AU', 'NZ'],
          interactionStatistic: {
            '@type': 'InteractionCounter',
            'interactionType': {
              '@type': 'WatchAction',
            },
            'userInteractionCount': 12,
          },
          hasPart: {
            name: 'Introduction',
            startOffset: 0,
            url: '/watch?t=0',
          },
          publication: {
            isLiveBroadcast: true,
            startDate: new Date(Date.UTC(2026, 0, 1)),
            endDate: new Date(Date.UTC(2026, 0, 1, 1)),
          },
          potentialAction: {
            'target': '/watch?t={seek_to_second_number}',
            'startOffset-input': 'required name=seek_to_second_number',
          },
        }),
      ])

      const [video] = await injectSchemaOrg(head)

      expect(video).toMatchObject({
        contentUrl: 'https://example.com/video.mp4',
        expires: '2026-02-01T00:00:00.000Z',
        hasPart: {
          '@type': 'Clip',
          'url': 'https://example.com/watch?t=0',
        },
        potentialAction: {
          '@type': 'SeekToAction',
          'target': 'https://example.com/watch?t={seek_to_second_number}',
        },
        publication: {
          '@type': 'BroadcastEvent',
          'endDate': '2026-01-01T01:00:00.000Z',
          'startDate': '2026-01-01T00:00:00.000Z',
        },
      })
      expect(video).not.toHaveProperty('url')
    })
  })

  it('leaves description empty when neither description nor caption is given', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineVideo({
          name: 'My cool video',
          thumbnailUrl: '/poster.jpg',
          uploadDate: '2020-11-10',
        }),
      ])

      const [video] = await injectSchemaOrg(head)

      expect(video.description).toBeUndefined()
    })
  })

  it('uses the caption before the page description', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineVideo({
          name: 'My cool video',
          caption: 'A cat chases a laser pointer',
        }),
      ])

      const [video] = await injectSchemaOrg(head)

      expect(video.description).toBe('A cat chases a laser pointer')
    }, { description: 'Page description' })
  })

  it('inherits page metadata on a root video', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineVideo({
          contentUrl: '/video.mp4',
        }),
      ])

      const graph = await injectSchemaOrg(head)
      const video = graph.find(node => node['@type'] === 'VideoObject')!
      const image = graph.find(node => node['@type'] === 'ImageObject')!

      expect(video).toMatchObject({
        name: 'Page title',
        description: 'Page description',
        uploadDate: '2020-01-01',
        image: { '@id': image['@id'] },
        thumbnailUrl: 'https://example.com/og.png',
      })
    }, {
      title: 'Page title',
      description: 'Page description',
      datePublished: '2020-01-01',
      image: '/og.png',
    })
  })

  it.each([
    ['a plain object', { contentUrl: '/trailer.mp4', thumbnailUrl: '/trailer.jpg' }],
    ['defineVideo()', defineVideo({ contentUrl: '/trailer.mp4', thumbnailUrl: '/trailer.jpg' })],
  ])('does not copy page metadata into a nested video given as %s', async (_, trailer) => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineMovie({
          name: 'My movie',
          image: '/movie.png',
          trailer,
        }),
      ])

      const graph = await injectSchemaOrg(head)
      const movie = graph.find(node => node['@type'] === 'Movie')!

      expect(movie.trailer).toEqual({
        '@type': 'VideoObject',
        'contentUrl': 'https://example.com/trailer.mp4',
        'thumbnailUrl': 'https://example.com/trailer.jpg',
      })
    }, {
      title: 'Page title',
      description: 'Page description',
      datePublished: '2020-01-01',
      image: '/og.png',
    })
  })

  it('resolves creator and author as Person or Organization nodes', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineVideo({
          name: 'Launch stream',
          creator: {
            '@type': 'Organization',
            'name': 'Studio',
          },
          author: {
            name: 'Ada',
          },
        }),
      ])

      const graph = await injectSchemaOrg(head)
      const video = graph.find(node => node['@type'] === 'VideoObject')!
      const organization = graph.find(node => node['@type'] === 'Organization')!
      const person = graph.find(node => node['@type'] === 'Person')!

      expect(organization.name).toBe('Studio')
      expect(person.name).toBe('Ada')
      expect(video.creator).toEqual({ '@id': organization['@id'] })
      expect(video.author).toEqual({ '@id': person['@id'] })
    })
  })
})
