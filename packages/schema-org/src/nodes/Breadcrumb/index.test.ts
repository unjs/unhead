import { expect } from 'vitest'
import { injectSchemaOrg, useSetup } from '../../../.test'
import { defineBreadcrumb, useSchemaOrg } from '../../'

describe('defineBreadcrumb', async () => {
  it('can be registered', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineBreadcrumb({
          itemListElement: [
            { name: 'Home', item: '/' },
            { name: 'Blog', item: '/blog' },
            { name: 'My Article' },
          ],
        }),
      ])

      const breadcrumbs = await injectSchemaOrg()

      expect(breadcrumbs).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#breadcrumb",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "item": "https://example.com",
                "name": "Home",
                "position": 1,
              },
              {
                "@type": "ListItem",
                "item": "https://example.com/blog",
                "name": "Blog",
                "position": 2,
              },
              {
                "@type": "ListItem",
                "name": "My Article",
                "position": 3,
              },
            ],
          },
        ]
      `)
    })
  })

  it('can handle duplicate', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineBreadcrumb({
          itemListElement: [
            { name: 'Home', item: '/', position: 1 },
            { name: 'Blog', item: '/blog', position: 2 },
            { name: 'My Article', position: 4 },
          ],
        }),

        defineBreadcrumb({
          itemListElement: [
            { name: 'Some joining page', item: '/blog/test', position: 3 },
          ],
        }),

        defineBreadcrumb({
          '@id': '#subbreadcrumb',
          'itemListElement': [
            { name: 'Some other link', item: '/blog/foo' },
          ],
        }),

        defineBreadcrumb({
          '@id': '#subbreadcrumb',
          'custom': 'test',
          'itemListElement': [
            { name: 'Some other link', item: '/blog/bar' },
          ],
        }),
      ])

      const client = await injectSchemaOrg()

      expect(client).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#breadcrumb",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "item": "https://example.com/blog/test",
                "name": "Some joining page",
                "position": 3,
              },
              {
                "@type": "ListItem",
                "item": "https://example.com",
                "name": "Home",
                "position": 1,
              },
              {
                "@type": "ListItem",
                "item": "https://example.com/blog",
                "name": "Blog",
                "position": 2,
              },
              {
                "@type": "ListItem",
                "name": "My Article",
                "position": 4,
              },
            ],
          },
          {
            "@id": "https://example.com/#subbreadcrumb",
            "@type": "BreadcrumbList",
            "custom": "test",
            "itemListElement": [
              {
                "@type": "ListItem",
                "item": "https://example.com/blog/bar",
                "name": "Some other link",
                "position": 1,
              },
              {
                "@type": "ListItem",
                "item": "https://example.com/blog/foo",
                "name": "Some other link",
                "position": 1,
              },
            ],
          },
        ]
      `)
    })
  })
})
