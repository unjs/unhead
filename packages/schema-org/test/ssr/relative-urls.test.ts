import { defineBook, defineEvent, defineImage, defineVideo, useSchemaOrg } from '@unhead/schema-org'
import { describe, expect, it } from 'vitest'
import { injectSchemaOrg, useSetup } from '../index'

describe.each(['https://example.com/', 'https://example.com/app/'])('schema.org URLs with host %s', (host) => {
  it('preserves protocol-relative book and performing group URLs', async () => {
    const url = '//cdn.example.org/media'
    await useSetup((head) => {
      useSchemaOrg(head, [
        defineBook({
          name: 'Book',
          url,
          workExample: { isbn: '9787543321724', bookFormat: 'Paperback', inLanguage: 'en' },
        }),
        defineEvent({
          name: 'Concert',
          eventAttendanceMode: 'OfflineEventAttendanceMode',
          performer: { '@type': 'PerformingGroup', 'name': 'Group', 'url': url },
        }),
      ])

      const graph = injectSchemaOrg(head)
      expect.soft(graph.find(node => node['@type'] === 'Book')).toMatchObject({
        url,
        workExample: { bookFormat: 'https://schema.org/Paperback' },
      })
      expect.soft(graph.find(node => node['@type'] === 'PerformingGroup')).toMatchObject({ url })
      expect(graph.find(node => node['@type'] === 'Event')).toMatchObject({
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      })
    }, { host })
  })

  it.each([
    ['//cdn.example.org/media', '//cdn.example.org/media'],
    ['https://cdn.example.org/media', 'https://cdn.example.org/media'],
    ['/media', `${host}media`],
    ['#media', `${host}#media`],
    ['media', 'media'],
    ['data:text/plain,media', 'data:text/plain,media'],
  ])('preserves the destination of %s', async (url, expected) => {
    await useSetup((head) => {
      useSchemaOrg(head, [
        defineImage({
          url,
          contentUrl: url,
          license: url,
          acquireLicensePage: url,
        }),
        defineVideo({
          name: 'Video',
          url,
          contentUrl: url,
          embedUrl: url,
          thumbnailUrl: url,
          hasPart: { name: 'Clip', startOffset: 0, url },
          potentialAction: {
            'target': url,
            'startOffset-input': 'required name=seek_to_second_number',
          },
        }),
      ])

      const graph = injectSchemaOrg(head)
      expect.soft(graph.find(node => node['@type'] === 'ImageObject')).toMatchObject({
        url: expected,
        contentUrl: expected,
        license: expected,
        acquireLicensePage: expected,
      })
      expect(graph.find(node => node['@type'] === 'VideoObject')).toMatchObject({
        url: expected,
        contentUrl: expected,
        embedUrl: expected,
        thumbnailUrl: expected,
        hasPart: { url: expected },
        potentialAction: { target: expected },
      })
    }, { host })
  })
})
