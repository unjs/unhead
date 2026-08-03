import { expect } from 'vitest'
import { defineOrganization, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineOrganization', () => {
  it('keeps a logo on the identity organization', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineOrganization({ name: 'Identity', logo: '/logo.png' }),
      ])

      const graph = await injectSchemaOrg(head)
      const identity = graph.find(node => node['@id'] === 'https://example.com/#identity')
      const logo = graph.find(node => node['@id'] === 'https://example.com/#logo')

      expect(identity?.logo).toEqual({ '@id': 'https://example.com/#logo' })
      expect(logo?.contentUrl).toBe('https://example.com/logo.png')
      expect(graph.filter(node => node['@type'] === 'Organization')).toHaveLength(1)
    })
  })

  it('keeps a compact node for specialized organizations', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineOrganization({ '@type': 'Corporation', 'name': 'Corp', 'logo': '/logo.png' } as any),
      ])

      const graph = await injectSchemaOrg(head)
      const identity = graph.find(node => node['@id'] === 'https://example.com/#identity')
      const compact = graph.find(node => node['@id'] === 'https://example.com/#organization')

      expect(identity).not.toHaveProperty('logo')
      expect(compact).toMatchObject({ '@type': 'Organization', 'logo': 'https://example.com/logo.png' })
    })
  })

  it('can be registered', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineOrganization({
          name: 'test',
          logo: '/logo.png',
          address: {
            addressCountry: 'Australia',
            postalCode: '2000',
            streetAddress: '123 st',
          },
        }),
      ])

      const client = await injectSchemaOrg(head)

      expect(client).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#identity",
            "@type": "Organization",
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "Australia",
              "postalCode": "2000",
              "streetAddress": "123 st",
            },
            "logo": {
              "@id": "https://example.com/#logo",
            },
            "name": "test",
            "url": "https://example.com/",
          },
          {
            "@id": "https://example.com/#logo",
            "@type": "ImageObject",
            "caption": "test",
            "contentUrl": "https://example.com/logo.png",
            "inLanguage": "en-AU",
            "url": "https://example.com/logo.png",
          },
        ]
      `)
    })
  })
})
