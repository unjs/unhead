import { expect } from 'vitest'
import { defineComment, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineComment', () => {
  it('can be registered', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineComment({
          text: 'This is a comment',
          author: {
            name: 'Harlan Wilton',
          },
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)
      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#/schema/comment/1",
            "@type": "Comment",
            "author": {
              "@id": "https://example.com/#/schema/person/1",
            },
            "text": "This is a comment",
          },
          {
            "@id": "https://example.com/#/schema/person/1",
            "@type": "Person",
            "name": "Harlan Wilton",
          },
        ]
      `)
    })
  })
})
