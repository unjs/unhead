import { expect } from 'vitest'
import { injectSchemaOrg, useSetup } from '../../../.test'
import { defineComment, useSchemaOrg } from '../../'

describe('defineComment', () => {
  it('can be registered', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineComment({
          text: 'This is a comment',
          author: {
            name: 'Harlan Wilton',
          },
        }),
      ])

      const graphNodes = await injectSchemaOrg()
      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#/schema/comment/37d2230",
            "@type": "Comment",
            "author": {
              "@id": "https://example.com/#/schema/person/9d0964",
            },
            "text": "This is a comment",
          },
          {
            "@id": "https://example.com/#/schema/person/9d0964",
            "@type": "Person",
            "name": "Harlan Wilton",
          },
        ]
      `)
    })
  })
})
