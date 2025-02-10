import { expect } from 'vitest'
import { injectSchemaOrg, useSetup } from '../../../../test/schema-org-utils'
import { defineImage, useSchemaOrg } from '../../util'

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
            "@id": "https://example.com/#/schema/image/4f5963e",
            "@type": "ImageObject",
            "contentUrl": "https://example.com/image.png",
            "inLanguage": "en-AU",
            "url": "https://example.com/image.png",
          },
        ]
      `)
    })
  })
})
