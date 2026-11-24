import { describe, expect, it } from 'vitest'
import {
  defineBook,
  defineBookEdition,
  defineCourse,
  defineOrganization,
  defineProduct,
  defineWebPage,
  useSchemaOrg,
} from '../src'
import { injectSchemaOrg, useSetup } from './index'

// The site identity publishes the page. It is not the brand, organizer,
// provider, or author of what the page describes, so those stay empty
// unless the user names them.
describe('relations the site identity must not fill', () => {
  it.each([
    {
      node: defineProduct({ name: 'Air Max', image: '/shoe.png' }),
      type: 'Product',
      key: 'brand',
    },
    {
      node: defineCourse({ name: 'Intro to CS', description: 'Basics of programming.' }),
      type: 'Course',
      key: 'provider',
    },
    {
      node: defineBook({ name: 'Emma', workExample: [defineBookEdition({ isbn: '9780141439587', bookFormat: 'https://schema.org/Hardcover', inLanguage: 'en' })] }),
      type: 'Book',
      key: 'author',
    },
  ])('leaves $type $key empty', async ({ node, type, key }) => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineOrganization({ name: 'Shoe Store', logo: '/logo.png' }),
        defineWebPage(),
        node,
      ])
      const resolved = (await injectSchemaOrg(head)).find(n => n['@type'] === type)
      expect(resolved).toBeDefined()
      expect(resolved).not.toHaveProperty(key)
    })
  })

  it('does not use the logo as the primary image of every page', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineOrganization({ name: 'Shoe Store', logo: '/logo.png' }),
        defineWebPage(),
      ])
      const webPage = (await injectSchemaOrg(head)).find(n => n['@id'] === 'https://example.com/#webpage')
      expect(webPage).toBeDefined()
      expect(webPage).not.toHaveProperty('primaryImageOfPage')
    })
  })

  it('does not give a book edition the site language', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineBook({
          name: 'Emma',
          author: { name: 'Jane Austen' },
          // @ts-expect-error Google requires inLanguage on every edition
          workExample: [{ isbn: '9780141439587', bookFormat: 'https://schema.org/Hardcover' }],
        }),
      ])
      const book = (await injectSchemaOrg(head)).find(n => n['@type'] === 'Book') as any
      expect(book.workExample).not.toHaveProperty('inLanguage')
    })
  })
})
