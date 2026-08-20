import { expect } from 'vitest'
import { defineImage, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineImage', () => {
  it('can be registered', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineImage({
          url: '/image.png',
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#/schema/image/1",
            "@type": "ImageObject",
            "contentUrl": "https://example.com/image.png",
            "inLanguage": "en-AU",
            "url": "https://example.com/image.png",
          },
        ]
      `)
    })
  })

  it('resolves image license metadata', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineImage({
          url: '/licensed.jpg',
          creator: {
            '@type': 'Organization',
            'name': 'Example Studio',
          },
          creditText: 'Example Studio',
          copyrightNotice: 'Copyright Example Studio',
          license: '/licenses/standard',
          acquireLicensePage: '/license-image',
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes[0]).toMatchObject({
        acquireLicensePage: 'https://example.com/license-image',
        license: 'https://example.com/licenses/standard',
      })
      expect(graphNodes[0].creator).toEqual({
        '@id': 'https://example.com/#/schema/organization/1',
      })
      expect(graphNodes[1]).toMatchObject({
        '@type': 'Organization',
        'name': 'Example Studio',
      })
    })
  })
})
