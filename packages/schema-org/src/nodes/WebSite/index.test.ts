import { expect } from 'vitest'
import { findNode, injectSchemaOrg, useSetup } from '../../../.test'
import { IdentityId, idReference, prefixId } from '../../utils'
import { defineOrganization, definePerson, defineSearchAction, defineWebPage, defineWebSite, useSchemaOrg } from '../../'
import type { WebSite } from './index'
import { PrimaryWebSiteId } from './index'

describe('defineWebSite', () => {
  it('can be registered', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineWebSite({
          name: 'test',
        }),
      ])

      const client = await injectSchemaOrg()

      expect(client).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#website",
            "@type": "WebSite",
            "inLanguage": "en-AU",
            "name": "test",
            "url": "https://example.com/",
          },
        ]
      `)
    })
  })

  it('sets up publisher as identity', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        definePerson({
          name: 'Harlan Wilton',
          image: '/image/me.png',
        }),
        defineWebSite({
          name: 'test',
        }),
      ])

      const website = await findNode<WebSite>(PrimaryWebSiteId)
      const identity = await findNode<WebSite>(IdentityId)

      expect(website?.publisher).toEqual(idReference(identity!))
    })
  })

  it('can set search action', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineWebSite({
          name: 'test',
          potentialAction: [
            defineSearchAction({
              target: '/search?query={search_term_string}',
            }),
          ],
        }),
      ])

      const website = await findNode<WebSite>(PrimaryWebSiteId)

      expect(website?.potentialAction).toMatchInlineSnapshot(`
        [
          {
            "@type": "SearchAction",
            "query-input": {
              "@type": "PropertyValueSpecification",
              "valueName": "search_term_string",
              "valueRequired": true,
            },
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "https://example.com/search?query={search_term_string}",
            },
          },
        ]
      `)
      expect(website?.potentialAction).toBeDefined()
      // @ts-expect-error weird typing
      expect(website?.potentialAction?.[0]?.target.urlTemplate).toEqual('https://example.com/search?query={search_term_string}')
    })
  })

  it('can set search action - flat', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineWebSite({
          name: 'test',
          potentialAction:
            defineSearchAction({
              target: '/search?query={search_term_string}',
            }),
        }),
      ])

      const website = await findNode<WebSite>(PrimaryWebSiteId)

      expect(website?.potentialAction).toMatchInlineSnapshot(`
        [
          {
            "@type": "SearchAction",
            "query-input": {
              "@type": "PropertyValueSpecification",
              "valueName": "search_term_string",
              "valueRequired": true,
            },
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "https://example.com/search?query={search_term_string}",
            },
          },
        ]
      `)
      expect(website?.potentialAction).toBeDefined()
      // @ts-expect-error weird typing
      expect(website?.potentialAction?.[0]?.target.urlTemplate).toEqual('https://example.com/search?query={search_term_string}')
    })
  })

  it('can handle multiple websites', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineWebSite({
          name: 'test',
        }),
      ])
      useSchemaOrg([
        defineWebSite({
          name: 'test 2',
        }),
      ])

      const ctx = await injectSchemaOrg()
      expect(ctx.length).toEqual(1)
      expect(ctx[0]['@id']).toBe('https://example.com/#website')
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

      const webSite = await findNode<WebSite>(PrimaryWebSiteId)
      expect(webSite?.publisher).toEqual(idReference(prefixId('https://example.com/', IdentityId)))
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

      const webSite = await findNode<WebSite>(PrimaryWebSiteId)
      expect(webSite?.publisher).toEqual(idReference(prefixId('https://example.com/', IdentityId)))
    })
  })

  it('relation resolving works both ways #2', async () => {
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

      const webSite = await findNode<WebSite>(PrimaryWebSiteId)
      expect(webSite?.publisher).toEqual(idReference(prefixId('https://example.com/', IdentityId)))
    })
  })
})
