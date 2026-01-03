import { expect } from 'vitest'
import { defineMusicGroup, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineMusicGroup', () => {
  it('can be defined', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineMusicGroup({
          name: 'The Beatles',
          genre: 'Rock',
          member: [
            { name: 'John Lennon' },
            { name: 'Paul McCartney' },
          ],
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#/schema/music-group/1",
            "@type": "MusicGroup",
            "genre": "Rock",
            "member": [
              {
                "@type": "Person",
                "name": "John Lennon",
              },
              {
                "@type": "Person",
                "name": "Paul McCartney",
              },
            ],
            "name": "The Beatles",
            "url": "https://example.com/",
          },
        ]
      `)
    })
  })
})
