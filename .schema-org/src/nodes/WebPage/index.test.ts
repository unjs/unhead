import { expect } from 'vitest'
import { findNode, injectSchemaOrg, useSetup } from '../../../.test'
import { PrimaryWebSiteId } from '../WebSite'
import { IdentityId, idReference, prefixId } from '../../utils'
import { defineImage, defineOrganization, defineReadAction, defineWebPage, defineWebSite, useSchemaOrg } from '../../'
import type { WebPage } from './index'
import { PrimaryWebPageId } from './index'

const mockDate = new Date(Date.UTC(2021, 10, 10, 10, 10, 10, 0))

describe('defineWebPage', () => {
  it('can be registered', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineWebPage({
          name: 'test',
          datePublished: mockDate,
          dateModified: mockDate,
        }),
      ])

      const webPage = await findNode<WebPage>(PrimaryWebPageId)
      expect(webPage).toMatchInlineSnapshot(`
        {
          "@id": "https://example.com/#webpage",
          "@type": "WebPage",
          "dateModified": "2021-11-10T10:10:10.000Z",
          "datePublished": "2021-11-10T10:10:10.000Z",
          "name": "test",
          "potentialAction": [
            {
              "@type": "ReadAction",
              "target": [
                "https://example.com/",
              ],
            },
          ],
          "url": "https://example.com/",
        }
      `)
    })
  })

  it('inherits attributes from useRoute()', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineWebPage(),
      ])

      const webPage = await findNode<WebPage>(PrimaryWebPageId)

      expect(webPage?.name).toEqual('headline')

      expect(webPage).toMatchInlineSnapshot(`
          {
            "@id": "https://example.com/test/#webpage",
            "@type": "WebPage",
            "description": "description",
            "name": "headline",
            "potentialAction": [
              {
                "@type": "ReadAction",
                "target": [
                  "https://example.com/test",
                ],
              },
            ],
            "url": "https://example.com/test",
          }
        `)
    }, {
      path: '/test',
      title: 'headline',
      description: 'description',
    })
  })

  it('passes Date objects into iso string', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineWebPage({
          name: 'test',
          datePublished: new Date(Date.UTC(2021, 10, 1, 0, 0, 0)),
          dateModified: new Date(Date.UTC(2022, 1, 1, 0, 0, 0)),
        }),
      ])

      const webPage = await findNode<WebPage>('#webpage')

      expect(webPage?.datePublished).toEqual('2021-11-01T00:00:00.000Z')
      expect(webPage?.dateModified).toEqual('2022-02-01T00:00:00.000Z')
    })
  })

  it('allows overriding the type', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineWebPage({
          '@type': 'FAQPage',
          'name': 'FAQ',
        }),
      ])

      const webPage = await findNode<WebPage>(PrimaryWebPageId)

      expect(webPage?.['@type']).toEqual(['WebPage', 'FAQPage'])
    })
  })

  it('adds read action to home page', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineWebPage(),
      ])

      const webpage = await findNode<WebPage>(PrimaryWebPageId)

      expect(webpage).toMatchInlineSnapshot(`
        {
          "@id": "https://example.com/#webpage",
          "@type": "WebPage",
          "description": "description",
          "name": "headline",
          "potentialAction": [
            {
              "@type": "ReadAction",
              "target": [
                "https://example.com/",
              ],
            },
          ],
          "url": "https://example.com/",
        }
      `)
    }, {
      path: '/',
      title: 'headline',
      description: 'description',
    })
  })

  it('can add readAction', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineWebPage({
          name: 'Webpage',
          potentialAction: defineReadAction({
            target: [
              'test',
            ],
          }),
        }),
      ])

      const webpage = await findNode<WebPage>(PrimaryWebPageId)

      expect(webpage).toMatchInlineSnapshot(`
          {
            "@id": "https://example.com/our-pages/about-us/#webpage",
            "@type": [
              "WebPage",
              "AboutPage",
            ],
            "name": "Webpage",
            "potentialAction": {
              "@type": "ReadAction",
              "target": [
                "https://example.com/our-pages/about-us",
                "test",
              ],
            },
            "url": "https://example.com/our-pages/about-us",
          }
        `)
    }, {
      path: '/our-pages/about-us',
    })
  })

  it('can infer @type from path', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineWebPage(),
      ])
      const webpage = await findNode<WebPage>(PrimaryWebPageId)

      expect(webpage?.['@type']).toMatchInlineSnapshot(`
        [
          "WebPage",
          "AboutPage",
        ]
      `)
    }, {
      path: '/our-pages/about-us',
    })
  })

  it('has default @type WebPage', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineWebPage(),
      ])

      const webPage = await findNode<WebPage>(PrimaryWebPageId)
      expect(webPage?.['@type']).toEqual('WebPage')
    })
  })

  it('supports augmentation with defaults', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineWebPage({
          '@type': ['CollectionPage', 'SearchResultsPage'],
        }),
      ])

      const webPage = await findNode<WebPage>(PrimaryWebPageId)
      expect(webPage?.['@type']).toEqual(['WebPage', 'CollectionPage', 'SearchResultsPage'])
    })
  })

  it('relation resolving works both ways', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineWebPage(),
      ])

      useSchemaOrg([
        defineOrganization({
          name: 'Harlan Wilton',
          logo: '/logo.png',
        }),
      ])

      useSchemaOrg([
        defineWebSite({
          name: 'Harlan Wilton',
        }),
      ])

      const webPage = await findNode<WebPage>(PrimaryWebPageId)
      expect(webPage?.about).toEqual(idReference(prefixId('https://example.com/', IdentityId)))
      expect(webPage?.isPartOf).toEqual(idReference(prefixId('https://example.com/', PrimaryWebSiteId)))
      expect(webPage?.primaryImageOfPage).toEqual(idReference(prefixId('https://example.com/', '#logo')))

      expect(await injectSchemaOrg()).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#webpage",
            "@type": "WebPage",
            "about": {
              "@id": "https://example.com/#identity",
            },
            "isPartOf": {
              "@id": "https://example.com/#website",
            },
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
            "@id": "https://example.com/#identity",
            "@type": "Organization",
            "logo": {
              "@id": "https://example.com/#logo",
            },
            "name": "Harlan Wilton",
            "url": "https://example.com/",
          },
          {
            "@id": "https://example.com/#website",
            "@type": "WebSite",
            "inLanguage": "en-AU",
            "name": "Harlan Wilton",
            "publisher": {
              "@id": "https://example.com/#identity",
            },
            "url": "https://example.com/",
          },
          {
            "@id": "https://example.com/#logo",
            "@type": "ImageObject",
            "caption": "Harlan Wilton",
            "contentUrl": "https://example.com/logo.png",
            "inLanguage": "en-AU",
            "url": "https://example.com/logo.png",
          },
        ]
      `)
      expect(webPage).toMatchInlineSnapshot(`
        {
          "@id": "https://example.com/#webpage",
          "@type": "WebPage",
          "about": {
            "@id": "https://example.com/#identity",
          },
          "isPartOf": {
            "@id": "https://example.com/#website",
          },
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
        }
      `)
    })
  })

  it('relation resolving works both ways #2', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineOrganization({
          name: 'Harlan Wilton',
          logo: '/logo.png',
        }),
      ])

      useSchemaOrg([
        defineWebPage(),
      ])

      useSchemaOrg([
        defineWebSite({
          name: 'Harlan Wilton',
        }),
      ])

      const webPage = await findNode<WebPage>(PrimaryWebPageId)
      expect(webPage?.about).toEqual(idReference(prefixId('https://example.com/', IdentityId)))
      expect(webPage?.isPartOf).toEqual(idReference(prefixId('https://example.com/', PrimaryWebSiteId)))
      expect(webPage?.primaryImageOfPage).toEqual(idReference(prefixId('https://example.com/', '#logo')))
    })
  })

  it('relation resolving works both ways #3', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineWebSite({
          name: 'Harlan Wilton',
        }),
      ])

      useSchemaOrg([
        defineOrganization({
          name: 'Harlan Wilton',
          logo: '/logo.png',
        }),
      ])

      useSchemaOrg([
        defineWebPage(),
      ])

      const webPage = await findNode<WebPage>(PrimaryWebPageId)
      expect(webPage?.about).toEqual(idReference(prefixId('https://example.com/', IdentityId)))
      expect(webPage?.isPartOf).toEqual(idReference(prefixId('https://example.com/', PrimaryWebSiteId)))
      expect(webPage?.primaryImageOfPage).toEqual(idReference(prefixId('https://example.com/', '#logo')))
    })
  })

  it('duplicate entries resolve as single', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineWebPage(),
      ])

      useSchemaOrg([
        defineWebPage({
          name: 'Harlan Wilton',
        }),
      ])

      const graphNodes = await injectSchemaOrg()

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#webpage",
            "@type": "WebPage",
            "name": "Harlan Wilton",
            "potentialAction": [
              {
                "@type": "ReadAction",
                "target": [
                  "https://example.com/",
                ],
              },
              {
                "@type": "ReadAction",
                "target": [
                  "https://example.com/",
                ],
              },
            ],
            "url": "https://example.com/",
          },
        ]
      `)
    })
  })

  it('arbitrary resolves', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineWebPage({ name: defineImage({ url: '/logo.png' }) }),
      ])

      const graphNodes = await injectSchemaOrg()

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#webpage",
            "@type": "WebPage",
            "name": {
              "@type": "ImageObject",
              "contentUrl": "https://example.com/logo.png",
              "inLanguage": "en-AU",
              "url": "https://example.com/logo.png",
            },
            "potentialAction": [
              {
                "@type": "ReadAction",
                "target": [
                  "https://example.com/",
                ],
              },
            ],
            "url": "https://example.com/",
          },
        ]
      `)
    })
  })

  it('arbitrary resolves trailing', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineWebPage({ image: defineImage({ url: '/logo.png' }) }),
      ])

      const graphNodes = await injectSchemaOrg()

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/about/#webpage",
            "@type": "WebPage",
            "image": {
              "@type": "ImageObject",
              "contentUrl": "https://example.com/logo.png",
              "inLanguage": "en-AU",
              "url": "https://example.com/logo.png",
            },
            "potentialAction": [
              {
                "@type": "ReadAction",
                "target": [
                  "https://example.com/about/",
                ],
              },
            ],
            "url": "https://example.com/about/",
          },
        ]
      `)
    }, {
      path: '/about',
      trailingSlash: true,
      host: 'https://example.com',
    })
  })
})
