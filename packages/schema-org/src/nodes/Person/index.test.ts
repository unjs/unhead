import type { Article } from '../Article'
import { describe, expect, it } from 'vitest'
import { defineArticle, defineOrganization, definePerson, defineWebPage, useSchemaOrg } from '../../'
import { findNode, injectSchemaOrg, useSetup } from '../../../test'
import { PrimaryArticleId } from '../Article'

describe('definePerson', () => {
  it('sets webpage about to the identity on the homepage', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        definePerson({ name: 'Harlan Wilton' }),
        defineWebPage(),
      ])

      const graph = await injectSchemaOrg(head)
      const webPage = graph.find(node => node['@id'] === 'https://example.com/#webpage')

      expect(webPage?.about).toEqual({ '@id': 'https://example.com/#identity' })
    })
  })

  it('does not set webpage about to the identity off the homepage', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        definePerson({ name: 'Harlan Wilton' }),
        defineWebPage(),
      ])

      const graph = await injectSchemaOrg(head)
      const webPage = graph.find(node => node['@id'] === 'https://example.com/posts/hello#webpage')

      expect(webPage).toBeDefined()
      expect(webPage).not.toHaveProperty('about')
    }, { path: '/posts/hello' })
  })

  it('can be registered', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        definePerson({
          name: 'test',
          image: '/logo.png',
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#identity",
            "@type": "Person",
            "image": {
              "@id": "https://example.com/#/schema/image/1",
            },
            "name": "test",
            "url": "https://example.com/",
          },
          {
            "@id": "https://example.com/#/schema/image/1",
            "@type": "ImageObject",
            "contentUrl": "https://example.com/logo.png",
            "inLanguage": "en-AU",
            "url": "https://example.com/logo.png",
          },
        ]
      `)
    })
  })

  it('will not create duplicate identities if one is provided', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineOrganization({
          name: 'test',
          logo: '/logo.png',
        }),
      ])

      useSchemaOrg(head, [
        definePerson({
          name: 'harlan wilton',
        }),
      ])

      const client = await injectSchemaOrg(head)
      expect(client.length).toBe(1)
      expect(client[0]['@type']).toBe('Person')
    })
  })

  it('links as article author if article present', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineArticle({
          headline: 'test',
          description: 'test',
          image: '/img.png',
        }),
      ])

      useSchemaOrg(head, [
        definePerson({
          name: 'Author',
        }),
      ])

      const article = await findNode<Article>(head, PrimaryArticleId)
      expect(article?.author).toMatchInlineSnapshot(`
          {
            "@id": "https://example.com/#identity",
          }
      `)
    })
  })

  it('resolve url with base', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        definePerson({
          name: 'test',
          url: '/test',
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#identity",
            "@type": "Person",
            "name": "test",
            "url": "https://example.com/test",
          },
        ]
      `)
    })
  })
})
