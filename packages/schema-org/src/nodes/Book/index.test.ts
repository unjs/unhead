import { expect } from 'vitest'
import { injectSchemaOrg, useSetup } from '../../../.test'
import { defineBook, defineBookEdition, definePerson, useSchemaOrg } from '../..'

describe('defineBook', () => {
  it('can be registered', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineBook({
          url: 'http://example.com/work/the_catcher_in_the_rye',
          name: 'The Catcher in the Rye',
          author: definePerson({
            name: 'J.D. Salinger',
          }),
          sameAs: 'https://en.wikipedia.org/wiki/The_Catcher_in_the_Rye',
          workExample: [
            defineBookEdition({
              isbn: '9787543321724',
              bookEdition: 'Mass Market Paperback',
              bookFormat: 'https://schema.org/Paperback',
              inLanguage: 'en',
              url: 'http://example.com/edition/the_catcher_in_the_rye_paperback',
              datePublished: '1991-05-01',
              identifier: {
                '@type': 'PropertyValue',
                'propertyID': 'OCLC_NUMBER',
                'value': '1057320822',
              },
            }),
          ],
        }),
      ])

      const graphNodes = await injectSchemaOrg()

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#book",
            "@type": "Book",
            "author": {
              "@type": "Person",
              "name": "J.D. Salinger",
            },
            "name": "The Catcher in the Rye",
            "sameAs": "https://en.wikipedia.org/wiki/The_Catcher_in_the_Rye",
            "url": "http://example.com/work/the_catcher_in_the_rye",
            "workExample": {
              "@type": "Book",
              "bookEdition": "Mass Market Paperback",
              "bookFormat": "https://schema.org/Paperback",
              "datePublished": "1991-4-1",
              "identifier": {
                "@type": "PropertyValue",
                "propertyID": "OCLC_NUMBER",
                "value": "1057320822",
              },
              "inLanguage": "en",
              "isbn": "9787543321724",
              "url": "http://example.com/edition/the_catcher_in_the_rye_paperback",
            },
          },
        ]
      `)
    })
  })
})
