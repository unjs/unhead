import { describe, expect, it } from 'vitest'
import { findNode, injectSchemaOrg, useSetup } from '../../../.test'
import type { Article } from '../Article'
import { PrimaryArticleId } from '../Article'
import { defineArticle, defineOrganization, definePerson, useSchemaOrg } from '../../'

describe('definePerson', () => {
  it('can be registered', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        definePerson({
          name: 'test',
          image: '/logo.png',
        }),
      ])

      const graphNodes = await injectSchemaOrg()

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#identity",
            "@type": "Person",
            "image": {
              "@id": "https://example.com/#/schema/image/d11938c",
            },
            "name": "test",
            "url": "https://example.com/",
          },
          {
            "@id": "https://example.com/#/schema/image/d11938c",
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
    await useSetup(async () => {
      useSchemaOrg([
        defineOrganization({
          name: 'test',
          logo: '/logo.png',
        }),
      ])

      useSchemaOrg([
        definePerson({
          name: 'harlan wilton',
        }),
      ])

      const client = await injectSchemaOrg()
      expect(client.length).toBe(1)
      expect(client[0]['@type']).toBe('Person')
    })
  })

  it('links as article author if article present', async () => {
    await useSetup(async () => {
      useSchemaOrg([
        defineArticle({
          headline: 'test',
          description: 'test',
          image: '/img.png',
        }),
      ])

      useSchemaOrg([
        definePerson({
          name: 'Author',
        }),
      ])

      const article = await findNode<Article>(PrimaryArticleId)
      expect(article?.author).toMatchInlineSnapshot(`
          {
            "@id": "https://example.com/#identity",
          }
      `)
    })
  })
})
