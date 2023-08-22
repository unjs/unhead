import { expect } from 'vitest'
import { injectSchemaOrg, useSetup } from '../../../.test'
import { defineVideo, useSchemaOrg } from '../../'

describe('defineVideo', () => {
  it('can be registered', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineVideo({
          name: 'My cool video',
          uploadDate: new Date(Date.UTC(2020, 10, 10)),
          url: '/image.png',
        }),
      ])

      const graphNodes = await injectSchemaOrg()

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#/schema/video/3a52059",
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
})
