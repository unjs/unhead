import { describe, expect, it } from 'vitest'
import { findNode, injectSchemaOrg, useSetup } from '../../../.test'
import type { Article } from '../..'
import { defineArticle, defineOrganization, defineWebPage, useSchemaOrg } from '../..'

const mockDate = new Date(Date.UTC(2021, 10, 10, 10, 10, 10, 0))

const defaultArticleInput = {
  headline: 'test',
  description: 'test',
  image: '/my-image.png',
  datePublished: new Date(Date.UTC(2021, 10, 10, 10, 10, 10, 0)),
  dateModified: new Date(Date.UTC(2021, 10, 10, 10, 10, 10, 0)),
}

describe('defineArticle', () => {
  it('can be registered', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineArticle(defaultArticleInput),
      ])

      const client = await injectSchemaOrg()

      expect(client).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#article",
            "@type": "Article",
            "dateModified": "2021-11-10T10:10:10.000Z",
            "datePublished": "2021-11-10T10:10:10.000Z",
            "description": "test",
            "headline": "test",
            "image": {
              "@id": "https://example.com/#/schema/image/10ff64c",
            },
            "inLanguage": "en-AU",
            "thumbnailUrl": "https://example.com/my-image.png",
          },
          {
            "@id": "https://example.com/#/schema/image/10ff64c",
            "@type": "ImageObject",
            "contentUrl": "https://example.com/my-image.png",
            "inLanguage": "en-AU",
            "url": "https://example.com/my-image.png",
          },
        ]
      `)
    })
  })

  it('inherits attributes from useRoute()', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineArticle(),
      ])

      const client = await injectSchemaOrg()

      const article = await findNode<Article>('#article')
      expect(article?.headline).toEqual('Article headline')
      expect(article?.description).toEqual('my article description')
      expect(article?.image).toMatchInlineSnapshot(`
        {
          "@id": "https://example.com/#/schema/image/4f5963e",
        }
      `)
      //
      // expect(client.graphNodes.length).toEqual(2)
      expect(client).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/test/#article",
            "@type": "Article",
            "dateModified": "2021-11-10T10:10:10.000Z",
            "datePublished": "2021-11-10T10:10:10.000Z",
            "description": "my article description",
            "headline": "Article headline",
            "image": {
              "@id": "https://example.com/#/schema/image/4f5963e",
            },
            "inLanguage": "en-AU",
            "thumbnailUrl": "https://example.com/image.png",
          },
          {
            "@id": "https://example.com/#/schema/image/4f5963e",
            "@type": "ImageObject",
            "contentUrl": "https://example.com/image.png",
            "inLanguage": "en-AU",
            "url": "https://example.com/image.png",
          },
        ]
      `)
    }, {
      path: '/test',
      title: 'Article headline',
      description: 'my article description',
      image: '/image.png',
      datePublished: mockDate,
      dateModified: mockDate,
    })
  })

  it('can define article with custom fields', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineArticle<{ somethingNew: 'test' }>({
          headline: 'test',
          datePublished: mockDate,
          description: 'test',
          somethingNew: 'test',
        }),
      ])

      const client = await injectSchemaOrg()
      expect(client).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#article",
            "@type": "Article",
            "datePublished": "2021-11-10T10:10:10.000Z",
            "description": "test",
            "headline": "test",
            "inLanguage": "en-AU",
            "somethingNew": "test",
          },
        ]
      `)
    })
  })

  it('passes Date objects into iso string', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineArticle({
          ...defaultArticleInput,
          datePublished: new Date(Date.UTC(2021, 10, 1, 0, 0, 0)),
          dateModified: new Date(Date.UTC(2022, 1, 1, 0, 0, 0)),
        }),
      ])

      const client = await injectSchemaOrg()
      const article = client[0]
      expect(article?.datePublished).toEqual('2021-11-01T00:00:00.000Z')
      expect(article?.dateModified).toEqual('2022-02-01T00:00:00.000Z')
    })
  })

  it('allows overriding the type', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineArticle({
          '@type': 'TechArticle',
          ...defaultArticleInput,
          'datePublished': mockDate,
          'dateModified': mockDate,
        }),
      ])

      const client = await injectSchemaOrg()
      const article = client[0]

      expect(article?.['@type']).toEqual(['Article', 'TechArticle'])
    })
  })

  it('adds read action to web page', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineWebPage(),
        defineArticle(defaultArticleInput),
      ])

      const client = await injectSchemaOrg()
      const webpage = client[0]

      expect(webpage?.potentialAction).toMatchInlineSnapshot(`
        [
          {
            "@type": "ReadAction",
            "target": [
              "https://example.com/",
            ],
          },
        ]
      `)
    })
  })

  it('clones date to web page', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineWebPage(),
        defineArticle({
          '@id': '#my-article',
          ...defaultArticleInput,
          'datePublished': mockDate,
          'dateModified': mockDate,
        }),
      ])

      const client = await injectSchemaOrg()
      const webpage = client[0]
      const article = client[1]

      expect(webpage?.dateModified).toEqual(article?.dateModified)
      expect(webpage?.datePublished).toEqual(article?.datePublished)
    })
  })

  it('handles custom author', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineOrganization({
          name: 'Identity',
          logo: 'test.png',
        }),
        defineWebPage(),
        defineArticle({
          ...defaultArticleInput,
          author: [
            {
              name: 'Harlan Wilton',
              url: 'https://harlanzw.com',
            },
          ],
        }),
      ])

      const client = await injectSchemaOrg()

      expect(client[2]).toMatchInlineSnapshot(`
        {
          "@id": "https://example.com/#article",
          "@type": "Article",
          "author": {
            "@id": "https://example.com/#/schema/person/605fa9",
          },
          "dateModified": "2021-11-10T10:10:10.000Z",
          "datePublished": "2021-11-10T10:10:10.000Z",
          "description": "test",
          "headline": "test",
          "image": {
            "@id": "https://example.com/#/schema/image/10ff64c",
          },
          "inLanguage": "en-AU",
          "isPartOf": {
            "@id": "https://example.com/#webpage",
          },
          "mainEntityOfPage": {
            "@id": "https://example.com/#webpage",
          },
          "publisher": {
            "@id": "https://example.com/#identity",
          },
          "thumbnailUrl": "https://example.com/my-image.png",
        }
      `)

      const id = client[2].author['@id']

      expect(id).toEqual('https://example.com/#/schema/person/605fa9')

      const person = client[3]
      expect(person).toMatchInlineSnapshot(`
        {
          "@id": "https://example.com/#/schema/person/605fa9",
          "@type": "Person",
          "name": "Harlan Wilton",
          "url": "https://harlanzw.com",
        }
      `)
    })
  })

  it('handles custom authors', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineOrganization({
          name: 'Identity',
          logo: '/test.png',
        }),
        defineWebPage(),
        defineArticle({
          ...defaultArticleInput,
          author: [
            {
              name: 'John doe',
              url: 'https://harlanzw.com',
            },
            {
              name: 'Jane doe',
              url: 'https://harlanzw.com',
            },
          ],
        }),
      ])

      const client = await injectSchemaOrg()

      expect(client).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#identity",
            "@type": "Organization",
            "logo": {
              "@id": "https://example.com/#logo",
            },
            "name": "Identity",
            "url": "https://example.com/",
          },
          {
            "@id": "https://example.com/#webpage",
            "@type": "WebPage",
            "about": {
              "@id": "https://example.com/#identity",
            },
            "dateModified": "2021-11-10T10:10:10.000Z",
            "datePublished": "2021-11-10T10:10:10.000Z",
            "potentialAction": [
              {
                "@type": "ReadAction",
                "target": [
                  "https://example.com/",
                ],
              },
            ],
            "primaryImageOfPage": {
              "@id": "https://example.com/#logo",
            },
            "url": "https://example.com/",
          },
          {
            "@id": "https://example.com/#article",
            "@type": "Article",
            "author": [
              {
                "@id": "https://example.com/#/schema/person/77f3c81",
              },
              {
                "@id": "https://example.com/#/schema/person/249c409",
              },
            ],
            "dateModified": "2021-11-10T10:10:10.000Z",
            "datePublished": "2021-11-10T10:10:10.000Z",
            "description": "test",
            "headline": "test",
            "image": {
              "@id": "https://example.com/#/schema/image/10ff64c",
            },
            "inLanguage": "en-AU",
            "isPartOf": {
              "@id": "https://example.com/#webpage",
            },
            "mainEntityOfPage": {
              "@id": "https://example.com/#webpage",
            },
            "publisher": {
              "@id": "https://example.com/#identity",
            },
            "thumbnailUrl": "https://example.com/my-image.png",
          },
          {
            "@id": "https://example.com/#/schema/person/77f3c81",
            "@type": "Person",
            "name": "John doe",
            "url": "https://harlanzw.com",
          },
          {
            "@id": "https://example.com/#/schema/person/249c409",
            "@type": "Person",
            "name": "Jane doe",
            "url": "https://harlanzw.com",
          },
          {
            "@id": "https://example.com/#logo",
            "@type": "ImageObject",
            "caption": "Identity",
            "contentUrl": "https://example.com/test.png",
            "inLanguage": "en-AU",
            "url": "https://example.com/test.png",
          },
          {
            "@id": "https://example.com/#/schema/image/10ff64c",
            "@type": "ImageObject",
            "contentUrl": "https://example.com/my-image.png",
            "inLanguage": "en-AU",
            "url": "https://example.com/my-image.png",
          },
        ]
      `)
    })
  })

  it('can match yoast schema', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineOrganization({
          name: 'Kootingal Pecan Company',
          logo: 'test',
        }),
        defineWebPage(),
      ])

      useSchemaOrg([
        defineArticle({
          wordCount: 381,
          datePublished: '2022-04-06T08:00:51+00:00',
          dateModified: '2022-04-06T08:00:53+00:00',
          author: {
            '@id': '#/schema/person/13c25c1e03aefc2d21fbd03df3d17432',
            'name': 'Mark BT',
          },
          thumbnailUrl: 'https://res.cloudinary.com/kootingalpecancompany/images/w_1920,h_2560/f_auto,q_auto/v1648723707/IMG_0446/IMG_0446.jpg?_i=AA',
          keywords: [
            'certified organic pecans',
            'Kootingal',
            'Orchard',
            'organic nuts',
            'Pecan tree',
          ],
          articleSection: [
            'Organic pecans, activated pecans, single source, Australian organic pecans',
            'Pecan tree',
          ],
        }),
      ])

      const client = await injectSchemaOrg()

      expect(client[2]).toEqual({
        '@type': 'Article',
        '@id': 'https://kootingalpecancompany.com/pecan-tree-kootingal/#article',
        'isPartOf': {
          '@id': 'https://kootingalpecancompany.com/pecan-tree-kootingal/#webpage',
        },
        'author': {
          '@id': 'https://kootingalpecancompany.com/#/schema/person/13c25c1e03aefc2d21fbd03df3d17432',
        },
        'headline': 'The pecan tree &#8220;Carya illinoinensis&#8221;',
        'dateModified': '2022-04-06T08:00:53.000Z',
        'datePublished': '2022-04-06T08:00:51.000Z',
        'mainEntityOfPage': {
          '@id': 'https://kootingalpecancompany.com/pecan-tree-kootingal/#webpage',
        },
        'wordCount': 381,
        'publisher': {
          '@id': 'https://kootingalpecancompany.com/#identity',
        },
        'image': {
          '@id': 'https://kootingalpecancompany.com/#/schema/image/ea5d710',
        },
        'thumbnailUrl': 'https://res.cloudinary.com/kootingalpecancompany/images/w_1920,h_2560/f_auto,q_auto/v1648723707/IMG_0446/IMG_0446.jpg?_i=AA',
        'keywords': [
          'certified organic pecans',
          'Kootingal',
          'Orchard',
          'organic nuts',
          'Pecan tree',
        ],
        'articleSection': [
          'Organic pecans, activated pecans, single source, Australian organic pecans',
          'Pecan tree',
        ],
        'inLanguage': 'en-US',
      })
    }, {
      host: 'https://kootingalpecancompany.com/',
      inLanguage: 'en-US',
      path: '/pecan-tree-kootingal',
      title: 'The pecan tree &#8220;Carya illinoinensis&#8221;',
      image: 'https://res.cloudinary.com/kootingalpecancompany/images/w_1920,h_2560/f_auto,q_auto/v1648723707/IMG_0446/IMG_0446.jpg?_i=AA',
    })
  })
})
